# MANUAL DE PROCEDIMIENTO Y OPERACIÓN DEL SISTEMA
## LYNX GESTIÓN

---

### 1. INFORMACIÓN GENERAL Y ARQUITECTURA
**LYNX Gestión** es una plataforma integral de administración de proyectos, control de movimientos financieros y análisis de métricas en tiempo real.

- **Frontend:** React 18 + Vite (SPA)
- **Estilos e Iconografía:** CSS modular + Lucide React
- **Gráficos y Métricas:** Recharts
- **Backend & Autenticación:** Supabase (`Gestion LYNX`)
- **Seguridad:** Row Level Security (RLS) + Trigger de auto-asignación de roles + Control de sesión única activa y desconexión por inactividad.
- **CI/CD & Hosting:** GitHub Actions (Compilación y auto-deploy a rama `gh-pages`) + Hostinger / GitHub Pages.

---

### 2. ESTRUCTURA DE LA BASE DE DATOS (SUPABASE)

La base de datos `Gestion LYNX` está estructurada en torno a 4 tablas relacionales protegidas mediante políticas RLS:

#### 2.1. Tabla `public.profiles`
Administra la identidad y los permisos de los usuarios del sistema.
- `id` (UUID): Clave primaria, vinculada a `auth.users(id)`.
- `email` (TEXT): Correo electrónico del usuario.
- `role` (TEXT): Rol asignado (`admin` o `user`).
- `is_approved` (BOOLEAN): Estado de aprobación para acceder al sistema.
- `current_session_id` (TEXT): Identificador único de la sesión activa en el navegador.
- `created_at` / `updated_at`: Marcas de tiempo de auditoría.

> **Regla de negocio:** El trigger `handle_new_user()` asigna automáticamente el rol `admin` y aprueba (`is_approved = true`) al primer usuario registrado en la plataforma. Los siguientes usuarios quedan en estado pendiente hasta ser aprobados por un administrador.

#### 2.2. Tabla `public.projects`
Registra los proyectos de la organización.
- `id` (UUID): Clave primaria autogenerada.
- `user_id` (UUID): Creador del proyecto.
- `name` (TEXT): Nombre del proyecto.
- `objective` (TEXT): Objetivo general o meta a cumplir.
- `target_audience` (TEXT): Público objetivo o beneficiarios.
- `progress` (NUMERIC): Porcentaje de avance (0 a 100%).
- `created_at`: Fecha y hora de creación.

#### 2.3. Tabla `public.project_stages`
Gestiona las etapas cronológicas de cada proyecto.
- `id` (UUID): Clave primaria autogenerada.
- `project_id` (UUID): Relación con la tabla `projects`.
- `name` (TEXT): Nombre de la etapa o hito.
- `start_date` (TEXT / DATE): Fecha de inicio estimada.
- `end_date` (TEXT / DATE): Fecha de finalización estimada.
- `status` (TEXT): Estado actual (`pending`, `in_progress`, `completed`).

#### 2.4. Tabla `public.movements`
Controla el flujo de caja e imputación financiera.
- `id` (UUID): Clave primaria autogenerada.
- `user_id` (UUID): Usuario que registró la operación.
- `type` (TEXT): Tipo de movimiento (`income` / `expense`).
- `amount` (NUMERIC): Monto de la operación.
- `date` (TEXT / DATE): Fecha del movimiento.
- `description` (TEXT): Detalle o motivo del gasto.
- `company` (TEXT): Responsable asignado (gastos) o Empresa emisora (ingresos).
- `account` (TEXT): Cuenta de origen/destino (ej. Mercado Pago, Banco).

---

### 3. MANUAL DE OPERACIÓN Y FLUJO DE USUARIO

#### 3.1. Acceso y Registro
1. Ingresar a la URL oficial del sistema: `https://gestioneslynx.lnx.com.ar/`.
2. Para nuevos usuarios: Seleccionar la pestaña **Registro**, completar correo y contraseña.
3. El primer usuario registrado ingresa de forma inmediata con privilegios de Administrador.

#### 3.2. Gestión de Proyectos y Cronogramas
1. En el menú lateral, seleccionar **Proyectos**.
2. Para crear un nuevo proyecto:
   - Hacer clic en **+ Nuevo Proyecto**.
   - Ingresar Nombre, Objetivo, Público Objetivo y Porcentaje inicial de avance.
   - Presionar **Guardar Proyecto**.
3. Para planificar etapas:
   - Seleccionar el proyecto en la lista.
   - En la sección de etapas, definir Nombre de la fase, Fecha de inicio, Fecha de fin y Estado.
   - Hacer clic en **Agregar Etapa**.

#### 3.3. Carga de Movimientos Financieros
1. En el menú lateral, seleccionar **Cargar Movimientos**.
2. Elegir entre la pestaña **Ingreso** o **Gasto**:
   - **Gasto:** Indicar Responsable, Descripción del gasto, Monto y Fecha.
   - **Ingreso:** Indicar Empresa/Cliente, Cuenta de cobro (ej. Mercado Pago), Monto y Fecha.
3. Presionar **Guardar Movimiento**. Los totales y métricas se actualizarán instantáneamente.

#### 3.4. Estadísticas y Métricas
1. **Estadísticas Financieras:** Permite visualizar:
   - Tarjetas KPI: Total Ingresado, Total Gastado y Balance Neto actual.
   - Gráfico Circular: Distribución de gastos segmentados por responsable.
   - Gráfico de Barras: Evolución del gasto mes a mes.
2. **Estadísticas de Proyectos:**
   - Gráfico de barras horizontales con el porcentaje de avance por proyecto.
   - Diagrama de cronograma de etapas por proyecto seleccionado.
   - Resumen ejecutivo en tabla con auditoría rápida de etapas y metas.

---

### 4. PROCEDIMIENTO DE DESPLIEGUE CONTINUO (CI/CD)

#### 4.1. Flujo de Auto-Deploy
Cada vez que se sube un cambio a la rama `main` en GitHub:
1. GitHub Actions ejecuta el workflow `.github/workflows/deploy.yml`.
2. Inyecta de forma segura los secretos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Ejecuta `npm run build` generando los archivos estáticos optimizados.
4. Publica automáticamente el contenido exclusivo de la carpeta `dist/` en la rama **`gh-pages`**.
5. Los servidores conectados a dicha rama (Hostinger o GitHub Pages) se actualizan inmediatamente sin requerir compilación en el servidor.

#### 4.2. Mantenimiento Preventivo Supabase (Keep-Alive)
- El workflow `.github/workflows/keep-alive.yml` se ejecuta automáticamente todos los días a las **12:00 UTC**.
- Realiza una consulta REST autenticada a la base de datos `Gestion LYNX`, evitando que Supabase suspenda el proyecto por inactividad.

#### 4.3. Política de Respaldo de Versiones
- Cada vez que se genera un nuevo compilado `dist`, el sistema realiza automáticamente una copia íntegra de la versión previa dentro del directorio `Versiones anteriores/dist_YYYYMMDD_HHMMSS`.

---

### 5. GUÍA DE RESOLUCIÓN DE PROBLEMAS FRECUENTES

| Problema | Causa Probable | Solución |
| :--- | :--- | :--- |
| **Error MIME type "text/plain" (main.jsx)** | El hosting está leyendo la raíz del repositorio (`src/main.jsx`) en lugar de la versión compilada. | En el panel de Git de Hostinger, cambiar la rama de despliegue a **`gh-pages`** y hacer Deploy. |
| **Error 404 en favicon o assets** | Rutas absolutas no encontradas en subdominio. | El archivo `vite.config.js` ya está configurado con `base: './'` y `public/favicon.png` vinculado. |
| **Sesión cerrada automáticamente** | Inactividad mayor a 5 minutos o inicio de sesión simultáneo en otro dispositivo. | Reingresar credenciales; es una medida de seguridad activa del sistema. |
| **Error "Cuenta pendiente de aprobación"** | Usuario registrado sin rol de administrador activo. | Un usuario administrador debe cambiar el campo `is_approved = true` en la tabla `profiles` de Supabase. |
