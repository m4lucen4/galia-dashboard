# Profesional y el extra myWeb

Las nuevas altas contratan Profesional y, opcionalmente, myWeb. Cada concepto cuesta **18,50 €/mes sin IVA**, o **177,60 €/año sin IVA** (20 % de descuento). Se aplica un **IVA fijo del 21 %**. Las suscripciones anteriores conservan sus precios y accesos manuales.

## Configuración antes de desplegar

Configura estas variables en **Vercel y en la Edge Function `stripe-webhook`**, manteniendo las variables antiguas sin cambios:

```env
STRIPE_PROFESSIONAL_V1_MONTHLY_PRICE_ID=price_1UT6hjE52sWnk13Ziu0rrHOW
STRIPE_PROFESSIONAL_V1_ANNUAL_PRICE_ID=price_1UT6hqE52sWnk13ZtZHj2qVx
STRIPE_MYWEB_MONTHLY_PRICE_ID=price_1UT6hqE52sWnk13Zo49Q6hLD
STRIPE_MYWEB_ANNUAL_PRICE_ID=price_1UT6i9E52sWnk13ZQiwY1mtf
STRIPE_VAT_21_TAX_RATE_ID=txr_REEMPLAZAR
```

Estos cuatro precios ya están creados en **Mocklab, producción**. En un sandbox deben crearse otros precios y configurarse sus propios identificadores. Los productos nuevos son Profesional (`prod_VU4rhwjxFwTjXB`) y myWeb (`prod_VU4r2RCHRjf7h6`), con metadatos `catalog_version=profesional_myweb_v1`.

**El precio `exclusive` no añade por sí solo el IVA.** Crea o selecciona en Stripe una tasa manual activa del 21 %, no incluida en el precio, y sustituye `txr_REEMPLAZAR`. El servidor comprueba sus propiedades antes de permitir altas o cambios del extra. Sin ella, responde 503 y no crea el Checkout. No se usa Stripe Tax automático ni se modifican los impuestos de suscripciones antiguas.

El servidor también necesita `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`; nunca deben exponerse como variables `VITE_*`.

Antes de actualizar el webhook, aplica **`supabase/migrations/20261021000100_serialize_subscription_projection.sql`** en el proyecto de destino con autorización del operador. Añade una tabla de concesiones temporales de escritura y tres RPC accesibles solo al servidor (`service_role`); no modifica columnas, contratos ni registros existentes. La migración no se ha aplicado a Supabase desde esta implementación.

## Despliegue y comprobación

1. Verifica los identificadores y la tasa en el entorno de destino. Revisa que el portal de clientes no permita cambios de catálogo que eludan las condiciones de esta oferta; conserva la gestión de medios de pago.
2. Tras verificar la migración de sincronización y sus permisos, despliega primero el webhook compatible. Suscribe el endpoint a `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.pending_update_applied`, `customer.subscription.pending_update_expired`, `invoice.paid` e `invoice.payment_failed`.
3. Despliega las API y el dashboard juntos. Las nuevas lecturas de suscripción requieren `/api/get-subscription`; no se debe desplegar solamente la interfaz.
4. Comprueba en sandbox las cuatro combinaciones, la prueba de siete días, un cobro proporcional que requiera autenticación, un pago rechazado, una retirada a renovación y la cancelación/reactivación de la suscripción con retirada programada.
5. Comprueba que el webhook actualiza `userData.has_web` y que el usuario ve su acceso actualizado al volver a Configuración. Comprueba también los clientes anteriores: mismo precio real de Stripe y ningún cambio de `has_web`.

No se han desplegado estos cambios ni se han ejecutado cobros de prueba en producción. Crear el catálogo no cambia ninguna suscripción existente.

## Comportamiento

| Acción | Cobro y acceso |
|---|---|
| Alta | Profesional y myWeb comparten periodicidad, factura y prueba de siete días. Stripe recibe líneas separadas e IVA exclusivo en la suscripción. |
| Añadir myWeb | Stripe factura la parte proporcional inmediatamente. `pending_if_incomplete` evita añadir el servicio si el pago falla; se ofrece el enlace de factura para completarlo. Durante la prueba no se adelanta su fecha de finalización. |
| Quitar myWeb | Una programación de Stripe mantiene ambos conceptos hasta la fecha de renovación y después conserva solo Profesional. No se reembolsa el periodo vigente. Si falla la configuración, se confirma si Stripe llegó a aplicarla o se libera únicamente la programación provisional intacta de ese intento para poder reintentar. Una programación modificada externamente requiere revisión de soporte, sin cancelarla automáticamente. |
| Cancelar toda la suscripción | Se conserva la cancelación al final del periodo, incluso cuando existe una retirada programada de myWeb. |
| Usuarios antiguos | No se migra ni se cambia su suscripción; se muestra el importe de sus líneas reales en Stripe. La gestión del extra desde el dashboard pertenece al nuevo catálogo. |

`has_web` se deriva de la suscripción real, no de la casilla del registro. El webhook adquiere una concesión de escritura antes de consultar el estado actual de Stripe. La actualización de suscripción y acceso se confirma en una única transacción. Un evento concurrente recibe un error para que Stripe lo reintente; una invocación con concesión caducada no puede sobrescribir un estado más reciente. Esto cubre pagos pendientes y cancelaciones sin restaurar accesos a partir de lecturas antiguas. Una concesión manual que ya existía al contratar queda conservada en los metadatos del servidor. No se elimina ninguna web publicada ni su contenido al retirar el extra; solo se modifica el acceso al constructor.

## Verificación y reversión

La migración se ha ejecutado exactamente en PostgreSQL 17 aislado para comprobar permisos exclusivos del servidor, propietarios concurrentes, concesiones caducadas, rechazo de escritores antiguos, reversión transaccional y conservación de datos anteriores. Esto no prueba su instalación ni las políticas reales del proyecto Supabase de destino.

El proyecto no incorpora archivos de pruebas. Se emplean comprobaciones temporales de los handlers HTTP y renderizado de componentes, con Stripe/Supabase simulados, además de `pnpm build`, `pnpm lint` y `pnpm exec tsc --project tsconfig.api.json --noEmit --composite false --incremental false`.

Una reversión debe coordinar API, interfaz y webhook: conserva el lector/proyector del nuevo catálogo mientras existan suscripciones nuevas o programaciones de retirada activas. No retires la tabla ni las RPC de sincronización mientras el webhook las utilice. No borres precios, metadatos ni accesos concedidos como mecanismo de reversión. El despliegue, la configuración fiscal y cualquier migración de clientes existentes son acciones del operador; no forman parte de una publicación automática.
