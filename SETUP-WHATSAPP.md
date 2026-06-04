# Integración WhatsApp Cloud API · Captación de proveedores

Guía de puesta en marcha de la integración de WhatsApp de FiestaGo.

**Flujo:** desde `/admin/whatsapp` envías la plantilla de captación a un proveedor →
el proveedor responde → el agente Claude continúa la conversación automáticamente.

---

## 1. Crear la app de WhatsApp en Meta

1. Entra en <https://developers.facebook.com/> → **My Apps** → **Create App** → tipo *Business*.
2. Añade el producto **WhatsApp**.
3. En **WhatsApp → API Setup** anota:
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - Genera un **token permanente** con un *System User* (Business Settings → Users → System Users → Generate token, con permisos `whatsapp_business_messaging` y `whatsapp_business_management`) → `WHATSAPP_TOKEN`
4. En **App Settings → Basic**, copia el **App Secret** → `WHATSAPP_APP_SECRET`.

## 2. Configurar el webhook

1. En **WhatsApp → Configuration → Webhook**:
   - **Callback URL:** `https://TU-DOMINIO/api/whatsapp/webhook`
   - **Verify token:** la cadena que tú elijas → debe coincidir con `WHATSAPP_VERIFY_TOKEN`
2. Pulsa **Verify and Save** (Meta hará un `GET` que la ruta responde automáticamente).
3. En **Webhook fields**, suscríbete a **`messages`**.

## 3. Crear la plantilla de captación (obligatorio)

WhatsApp **no permite escribir en frío con texto libre**: el primer mensaje debe ser
una plantilla aprobada.

1. **WhatsApp → Message Templates → Create Template**
   - Categoría: *Marketing* (o *Utility* si encaja mejor)
   - Idioma: Español (`es`)
   - Nombre: `fiestago_outreach` (o el que pongas en `WHATSAPP_OUTREACH_TEMPLATE`)
   - Cuerpo con **un parámetro** `{{1}}`, por ejemplo:

     > Hola {{1}}, te escribimos desde FiestaGo, el marketplace de celebraciones.
     > Damos de alta gratis a proveedores como tú y te llevamos reservas de clientes
     > (solo 8% de comisión, y tu primera reserva sin comisión). ¿Te cuento cómo va?

2. Espera a que Meta la **apruebe**. El parámetro `{{1}}` se rellena con el nombre del proveedor.

## 4. Variables de entorno (Netlify → Site settings → Environment variables)

| Variable | Descripción |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número emisor |
| `WHATSAPP_TOKEN` | Token permanente del System User |
| `WHATSAPP_APP_SECRET` | App Secret (verifica la firma del webhook) |
| `WHATSAPP_VERIFY_TOKEN` | La misma cadena que pusiste en Meta |
| `ANTHROPIC_API_KEY` | Clave de la API de Claude |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role de Supabase (servidor) |
| `WHATSAPP_OUTREACH_TEMPLATE` | *(opcional)* nombre de la plantilla, por defecto `fiestago_outreach` |
| `WHATSAPP_TEMPLATE_LANG` | *(opcional)* idioma, por defecto `es` |
| `WHATSAPP_GRAPH_VERSION` | *(opcional)* versión de la Graph API, por defecto `v21.0` |
| `ANTHROPIC_MODEL` | *(opcional)* modelo del agente, por defecto `claude-opus-4-8` |

Ya deberías tener además `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 5. Base de datos

La tabla `whatsapp_messages` **ya existe** en Supabase. El esquema está documentado
en `supabase/migrations/whatsapp_messages.sql` (idempotente). El proveedor se asocia
por su número en `providers.phone` o `providers.outreach_whatsapp`.

## 6. Uso

1. Entra en `/admin/whatsapp`.
2. Elige un proveedor (la lista se ordena por `agent_fit_score`).
3. Pulsa **Enviar plantilla de captación** (puedes ver un borrador con **Borrador con IA**).
4. Cuando el proveedor responda, el webhook lo recibe y el **agente responde solo**.
   Dentro de la ventana de 24h también puedes enviar texto a mano desde la bandeja.

## Archivos

```
lib/whatsapp.ts                       Cliente Cloud API + verificación de firma
lib/fiestago-agent.ts                 Agente Claude (prompt caching)
lib/supabase-admin.ts                 Cliente service_role
app/api/whatsapp/webhook/route.ts     Webhook (verificación + recepción + auto-respuesta)
app/admin/whatsapp/page.tsx           Bandeja (server component)
app/admin/whatsapp/WhatsappInbox.tsx  UI de la bandeja (client component)
app/admin/whatsapp/actions.ts         Server actions (enviar plantilla / texto / borrador)
supabase/migrations/whatsapp_messages.sql
```

> ⚠️ **Seguridad:** `/admin/whatsapp` usa la `service_role` y envía WhatsApp.
> Asegúrate de que `/admin` está protegido por la autenticación de admin de tu
> proyecto antes de desplegar.
