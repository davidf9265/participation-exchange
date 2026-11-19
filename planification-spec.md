# Spec: compra de participaciones

Feature nuevo: permitir que una credit union compre una porción (participación) de un listing de cartera desde el Marketplace. El usuario compra en nombre de la cuenta compradora (hoy fija: Riverbend Federal Credit Union).

## 1. Decisiones respecto al borrador original

| Borrador | Refinamiento | Por qué |
|---|---|---|
| DTO con cuenta source, cuenta objetivo y monto | El DTO solo lleva `amount`. | El comprador sale de `VIEWER_CU_ID` en el backend. El vendedor sale de `listing.sellerCuId`. Si el cliente mandara ambos IDs, decidiría quién compra. |
| Módulo `transactions` | Se mantiene el módulo, pero el endpoint es `POST /listings/:id/participations`. | Es el contrato que fija el README. El listing va en la ruta. |
| "Transferir dinero" entre cuentas | Se crea una fila `Participation` y se decrementa `Listing.remainingAmount`. | `CreditUnion` no tiene saldo. No hay balances que mover. |
| Módulo de cuentas | `AccountsModule` exporta `AccountsService`, que envuelve `CreditUnion`. | Separación de responsabilidades, accesible desde transactions. |
| (no estaba) Idempotencia | Header `Idempotency-Key` obligatorio, persistido en `Participation` con unicidad. | Un reintento (red caída, doble clic) no debe comprar dos veces. Ver 3.4. |
| (no estaba) Atomicidad | Toda la compra ocurre en una única transacción de base de datos, con rollback total y reintento seguro. | No puede quedar nada a medias. Ver 3.5. |

`CreditUnion` se asume como la tabla de cuentas: es una cuenta de organización, no de usuario (no hay personas, roles ni credenciales).

## 2. Modelo de datos y relaciones

```
CreditUnion (cuenta)
 ├─1:N─ Listing.sellerCuId        (vende)
 └─1:N─ Participation.buyerCuId   (compra)

Listing 1:N Participation.listingId
```

- **`Participation` es el registro de la transacción.** Campos: `listingId`, `buyerCuId`, `amount`, `purchasedAt`. El vendedor no se guarda en la fila; se obtiene vía `listing.sellerCuId`.
- **No hace falta una tabla `Transaction` nueva.** Duplicaría `Participation`. Solo haría falta para un ledger de movimientos de dinero.
- **`Listing.remainingAmount` está desnormalizado.** Invariante (la cumple el seed, la base de datos no la garantiza):
  `remainingAmount = principalAmount − Σ participations.amount`
- **`status` pasa a `FUNDED` cuando `remainingAmount` llega a 0.** Hoy no se sincroniza solo.
- Montos y tasas son `Decimal` en Postgres y viajan como **strings** en JSON.

### Cambios de esquema (requieren migración)

**Requeridos por este feature:**
- `Participation.idempotencyKey String` con `@@unique([buyerCuId, idempotencyKey])`. La unicidad por cuenta compradora evita que la clave de una cuenta choque con la de otra. La migración rellena las filas existentes (seed) con `'legacy:' || id` antes de marcar la columna `NOT NULL`.
- `CHECK ("remainingAmount" >= 0)` en `Listing`: última defensa en la base de datos si la lógica de aplicación falla.

**Recomendados:**
- Índice en `Participation.listingId` (hoy solo existe en `buyerCuId`).
- Ver sección 7 para el resto de trazabilidad.

## 3. Backend (NestJS)

### 3.1 `TransactionsModule`

- **Controller:** `POST /listings/:listingId/participations`, declarado en `TransactionsController` (`@Controller('listings/:listingId/participations')`), no en `ListingsController`, para evitar un import circular con listings.
- **`CreateParticipationDto`:** solo `amount`, validado con class-validator como string decimal (`@IsDecimal({ decimal_digits: '0,2' })`). Con `whitelist: true`, cualquier otro campo (por ejemplo un `buyerCuId` enviado por el cliente) se descarta.
- **Header `Idempotency-Key`:** obligatorio, UUID v4, leído con `@Headers('idempotency-key')` y validado en el controller (no va en el body). Ver 3.4.
- **`TransactionsService.purchase(listingId, amount)`**, dentro de `prisma.$transaction`:
  1. Obtiene el comprador con `AccountsService.getViewer()`.
  2. **Idempotencia:** busca una `Participation` con `(buyerCuId, idempotencyKey)`. Si existe, aplica la regla de 3.4 y termina sin tocar nada.
  3. Lee el listing; si no existe, 404.
  4. Valida las reglas de negocio (3.3).
  5. Decremento condicional: `updateMany({ where: { id, status: 'OPEN', remainingAmount: { gte: amount } }, data: { remainingAmount: { decrement: amount } } })`. Si `count === 0`, responde 409 (otra compra se adelantó). Evita el *check-then-act* y la sobreventa por concurrencia.
  6. Crea la `Participation` con su `idempotencyKey`.
  7. Marca `FUNDED` con un update condicional, no leyendo el valor: `updateMany({ where: { id, remainingAmount: 0 }, data: { status: 'FUNDED' } })`. Si el saldo no llegó a 0, no afecta ninguna fila.
  8. **Verificación final:** relee el listing y comprueba `remainingAmount >= 0` y el estado esperado. Si algo no cuadra, lanza error y la transacción hace rollback.
  9. Devuelve la participación con `listing.sellerCu` (misma forma que ya consume `/portfolio`).
- Los pasos 2 a 8 son una sola transacción (ver 3.5). Nada fuera de ella modifica datos.
- Los montos se manejan con `Prisma.Decimal`, nunca con floats.

### 3.2 `AccountsModule`

- `AccountsService` envuelve `PrismaService.creditUnion`: `findById(id)` y `getViewer()`.
- Exporta el servicio; `TransactionsModule` lo importa. `PortfolioService` podría migrar después a usarlo.
- Capa de acceso fina, sin lógica propia (no hay saldos ni auth).
- `VIEWER_CU_ID` (hoy en `api/src/viewer.ts`) pasa a ser la única fuente de verdad del API desde aquí.

### 3.3 Reglas de negocio

| Regla | Origen | Error |
|---|---|---|
| `amount > 0` y máximo 2 decimales | DTO | 400 |
| `amount <= remainingAmount` | tope por listing | 422 |
| Listing `OPEN` | estado | 409 |
| Comprador ≠ vendedor | integridad | 422 |
| Monto mínimo de compra | **por definir** (pregunta 1) | 422 |
| `Idempotency-Key` ausente o no es UUID | cabecera | 400 |
| Misma clave con distinto listing o monto | idempotencia | 422 |
| Conflicto transitorio agotó los reintentos | concurrencia | 503 con `Retry-After` |

### 3.4 Estrategia de idempotencia

**Objetivo:** que repetir la misma petición (reintento por timeout, doble clic, reenvío del navegador) produzca exactamente una compra.

**Contrato:**
- El cliente genera un UUID por *intento de compra* y lo manda en `Idempotency-Key`.
- La clave se persiste en la misma fila `Participation` que crea la compra, con `@@unique([buyerCuId, idempotencyKey])`. La clave y el efecto nacen y mueren juntos: no puede existir una sin la otra.

**Comportamiento del servidor:**

| Situación | Respuesta |
|---|---|
| Clave nueva | Ejecuta la compra y responde 201. |
| Clave ya usada, mismo `listingId` y mismo `amount` | No ejecuta nada. Devuelve la participación original con 200 y el header `Idempotent-Replay: true`. |
| Clave ya usada, distinto `listingId` o `amount` | 422: la clave se reutilizó para otra operación. No se modifica nada. |
| Dos peticiones simultáneas con la misma clave | La restricción única deja pasar solo a una. La otra recibe `P2002`, su transacción hace rollback completo (incluido su decremento) y, fuera de la transacción, se lee la fila ganadora y se responde como replay. |

**Detalles de implementación:**
- La comparación de payload se hace contra la fila guardada (`listingId`, `amount`), sin necesidad de guardar un hash aparte.
- El `P2002` se captura **fuera** de `prisma.$transaction`: en Postgres una transacción con error queda abortada y no se puede seguir usando.
- Las claves no expiran: viven tanto como la participación. No hay job de limpieza.
- Comprobar primero la clave (paso 2) es solo un atajo; la garantía real es la restricción única.

### 3.5 Atomicidad y fallback

**Regla:** la compra es todo o nada. Estas tres escrituras suceden juntas o no suceden: crear `Participation`, decrementar `Listing.remainingAmount` y, si corresponde, pasar el listing a `FUNDED`.

**Mecanismo:**
- Una única `prisma.$transaction(async (tx) => { ... })` interactiva. Todo acceso a datos dentro usa `tx`, nunca el `prisma` global.
- Nivel de aislamiento: `ReadCommitted` (el predeterminado). La seguridad la da el `UPDATE` condicional, que bloquea la fila del listing hasta el commit, más la restricción única y el `CHECK`. No hace falta `Serializable`.
- Se fijan `maxWait` y `timeout` explícitos en la transacción para que una espera no se cuelgue indefinidamente.
- **Sin efectos secundarios dentro de la transacción:** nada de llamadas HTTP ni notificaciones. Si más adelante se necesitan, van después del commit (o con patrón outbox), porque no se pueden deshacer con un rollback.

**Fallback (qué pasa cuando algo falla):**

| Fallo | Qué ocurre | Estado final |
|---|---|---|
| Error de validación o regla de negocio | Se lanza dentro de la transacción: rollback. | Sin cambios. 4xx. |
| Saldo insuficiente o listing ya no `OPEN` (`count === 0`) | Rollback. | Sin cambios. 409. |
| Violación de la restricción de idempotencia | Rollback, y se responde como replay (3.4). | Una sola compra. |
| Verificación final falla (paso 8) o `CHECK` violado | Rollback. Se registra como error crítico. | Sin cambios. 500. |
| Deadlock o conflicto de serialización (`P2034`, `40001`, `40P01`) | Reintento automático, hasta 3 veces con backoff corto, **con la misma clave**. Es seguro porque la compra es idempotente. | Si se agotan: sin cambios, 503 con `Retry-After`. |
| Caída del proceso o de la conexión a mitad de transacción | Postgres revierte la transacción no confirmada. | Sin cambios. El cliente reintenta con la misma clave. |
| Caída *después* del commit pero antes de responder | La compra existe pero el cliente no lo sabe. | El reintento con la misma clave devuelve el replay (200). |

**Garantías que se verifican:**
- Nunca hay una `Participation` sin su decremento, ni un decremento sin su `Participation`.
- `remainingAmount = principalAmount − Σ participations.amount` se mantiene tras cualquier secuencia de éxitos y fallos.
- `remainingAmount >= 0` siempre, también bajo concurrencia.
- Este endpoint es el único camino que mantiene `remainingAmount`: hoy solo lo calcula el seed una vez y nada lo recalcula después. Una `Participation` insertada por otra vía (SQL manual, otro código) deja el saldo desfasado, y la reconciliación es lo que lo detecta.
- Una consulta de reconciliación (la invariante anterior sobre todos los listings) debe devolver cero filas inconsistentes. Se usa en las pruebas de aceptación.

## 4. Frontend (Next.js)

Cambios en `web/src/app/listings/page.tsx` y componentes nuevos. Convención del web: tabs y comillas dobles.

- **Columna de acción al final de la tabla** con un botón "Buy".
  - Deshabilitado si el listing no tiene saldo.
  - Oculto o deshabilitado si el vendedor es el propio comprador. `VIEWER_CU` no tiene el id hoy: agregarlo a `web/src/lib/viewer.ts` o devolver un flag `isOwn` desde el API (pregunta 3).
- **`PurchaseDialog`** en `web/src/components/`:
  - Muestra referencia, vendedor, grado, yield, plazo y disponible.
  - Input de monto, con atajo "Max" opcional.
  - Validación en cliente: monto > 0, <= disponible, >= mínimo.
  - Muestra en el modal el error devuelto por el API (409/422).
- **Tras el éxito:** cierra el modal y vuelve a llamar `load()` para refrescar `remainingAmount`. Un listing que queda `FUNDED` desaparece de la lista porque `findAll` filtra `OPEN`.
- **Cliente HTTP:** `getJson` solo hace GET; agregar `postJson` en `web/src/lib/api.ts` que acepte headers y propague el mensaje de error del API.
- **Idempotency-Key en el cliente:**
  - Se genera con `crypto.randomUUID()` al abrir el modal y se manda en cada envío.
  - Se **conserva** si el resultado es incierto (error de red, timeout, 5xx, 503): el reintento usa la misma clave y es seguro.
  - Se **regenera** si el usuario cambia el monto, o tras una respuesta definitiva (éxito o 4xx).
  - El botón de confirmar se deshabilita mientras hay una petición en vuelo, para evitar doble clic.
- **Fallback de UI ante resultado incierto:** si la petición falla sin respuesta, el modal ofrece "Reintentar" (misma clave) y no cierra. Si el usuario cierra el modal, se recarga el listado y el portfolio para mostrar el estado real. Un replay (200) se trata como éxito.
- **Tipos:** `Participation` y `Listing` en `web/src/lib/api.ts` se mantienen a mano; mantenerlos sincronizados con las respuestas del API.
- **Aritmética del monto:** con helpers de `lib/format` o comparando strings decimales, no con floats directos.
- La validación en cliente es solo UX; la fuente de verdad es el backend.

## 5. Criterios de aceptación

1. Una compra válida crea una `Participation`, baja `remainingAmount` y aparece en `/portfolio`.
2. Un monto mayor al disponible devuelve 422 y no cambia nada.
3. Dos compras concurrentes que juntas exceden el saldo: una gana y la otra recibe 409.
4. Un cliente que mande `buyerCuId` o `sellerCuId` en el body no los afecta.
5. Un listing que llega a 0 queda `FUNDED` y sale del Marketplace.
6. Enviar dos veces la misma petición (misma clave, mismo payload) crea una sola `Participation`; la segunda responde 200 con `Idempotent-Replay: true` y el mismo cuerpo.
7. Reutilizar una clave con otro monto o listing devuelve 422 y no cambia nada.
8. Diez peticiones simultáneas con la misma clave producen una sola compra y `remainingAmount` baja una sola vez.
9. Si cualquier paso de la transacción falla (se puede forzar lanzando un error tras el decremento), no queda ninguna `Participation` ni cambia `remainingAmount`.
10. Tras las pruebas 2, 3, 6, 8 y 9, la consulta de reconciliación no encuentra listings inconsistentes.
11. Una petición sin `Idempotency-Key` devuelve 400.

## 6. Preguntas abiertas

1. **¿Cuál es el monto mínimo?** ¿Fijo, un porcentaje del principal, o por tipo de préstamo?
2. **¿Hay tope por comprador por listing o por cartera total?** Hoy el único tope derivable es `remainingAmount`.
3. **¿Se prohíbe que Riverbend compre sus propios listings?** Se asume que sí. Hoy es posible: es vendedor de `lst-0025` y `lst-0026`.
4. **¿`FUNDED` automático al llegar a 0?** Se asume que sí.

## 7. Trazabilidad: estado actual y opciones

### Estado actual

Hay trazabilidad parcial y accidental, no diseñada.

**Existe:**
- `Participation.purchasedAt`: cuándo se compró.
- `Participation.buyerCuId`, `Listing.sellerCuId`, `Participation.listingId`: quién y qué, a nivel de cuenta.
- `Listing.createdAt` y `originatedAt`.
- FKs con `ON DELETE RESTRICT`: no se puede borrar una CU o listing con filas dependientes.
- El saldo es reconstruible desde las participaciones, mientras estas no se editen ni se borren.

**Falta:**
- Historial de cambios: ningún modelo tiene `updatedAt`, auditoría ni versionado.
- `remainingAmount` se sobrescribe sin registro de cuándo ni por qué cambió.
- `status` no guarda fecha ni causa del paso `OPEN` → `FUNDED`.
- `Participation` es mutable y borrable: sin estado, sin soft delete, sin inmutabilidad de `amount`.
- Sin snapshot de condiciones de compra (`yieldRate`, `termMonths`, `riskGrade`); afecta al yield proyectado del stretch.
- Sin actor humano (no hay tabla de usuarios): solo se sabe qué cuenta.
- ~~Sin clave de idempotencia~~: resuelto por este feature (3.4).
- `CreditUnion` sin timestamps.
- Sin ledger de movimientos de dinero.

### Opciones, de menor a mayor costo

1. **Mínimo viable:** `createdAt` y `updatedAt` en `Participation` y `Listing`; tratar `Participation` como inmutable por convención (el servicio nunca hace `update` ni `delete`).
2. **Snapshot:** guardar `yieldRate` y `termMonths` vigentes en `Participation`.
3. **Trazabilidad real:** tabla `AuditLog` append-only (entidad, id, acción, antes/después, fecha, cuenta) escrita en la misma transacción de la compra. La clave de idempotencia ya está incluida en el alcance (3.4).

Para el ejercicio: la 1 y, si hay tiempo, la 2. La 3 se nombra como "qué haría antes de producción".
