# MANUAL DE PROCEDIMIENTO Y OPERACIÓN DEL SISTEMA
## LYNX GESTIÓN (Edición Pro & Enterprise)

---

### 1. INFORMACIÓN GENERAL Y ARQUITECTURA
**LYNX Gestión** es una plataforma de alta gama para la administración ejecutiva de proyectos, control de movimientos financieros y análisis de métricas en tiempo real.

- **Frontend:** React 18 + Vite (SPA) con arquitectura Glassmorphism 2.0.
- **Tipografía y Estilos:** Plus Jakarta Sans + JetBrains Mono, paleta Dark Slate con acentos dorados/ámbar LYNX.
- **Notificaciones:** Sistema nativo de Toasts flotantes con retroalimentación no invasiva.
- **Gráficos y Métricas:** Recharts con gradientes, tooltips personalizados y exportación a CSV/Excel.
- **Backend & Autenticación:** Supabase (`Gestion LYNX`) con Row Level Security (RLS), trigger de auto-asignación de roles y control de sesión única.
- **CI/CD & Hosting:** GitHub Actions (Compilación y auto-deploy a rama `gh-pages` + sincronización de producción en `main`).

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
- `progress` (NUMERIC): Porcentaje de avance ponderado (0 a 100%).
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
- `amount` (NUMERIC): Monto de la operación en pesos.
- `date` (TEXT / DATE): Fecha del movimiento.
- `description` (TEXT): Detalle o motivo del gasto.
- `company` (TEXT): Responsable asignado (gastos) o Empresa emisora (ingresos).
- `account` (TEXT): Cuenta de origen/destino (ej. Mercado Pago, Personal Pay, Cuenta Bancaria).

---

### 3. MANUAL DE OPERACIÓN Y FLUJO DE USUARIO

#### 3.1. Acceso y Registro (Login Pro)
1. Ingresar a la URL oficial del sistema: `https://gestioneslynx.lnx.com.ar/`.
2. Para nuevos usuarios: Seleccionar la pestaña **Registro**, completar correo y contraseña (con botón de visualización de contraseña).
3. El primer usuario registrado ingresa de forma inmediata con privilegios de Administrador.

#### 3.2. Gestión de Movimientos & Libro Mayor en Vivo
1. En el menú lateral, seleccionar **Cargar Movimientos**.
2. **KPIs en Vivo:** Visualiza al instante en la parte superior los totales ingresados, gastados y el balance neto acumulado.
3. **Cargar Gasto / Ingreso:** Alterna entre las pestañas, completa el formulario y presiona Guardar.
4. **Historial Integrado:** En el panel lateral derecho, busca transacciones por responsable o motivo, filtra por tipo y elimina registros erróneos con un solo clic.

#### 3.3. Gestión de Proyectos y Cronogramas (Master-Detail)
1. En el menú lateral, seleccionar **Gestión de Proyectos**.
2. **Creación:** Clic en **+ Nuevo Proyecto**, define nombre, público y objetivos.
3. **Seguimiento de Etapas:** Selecciona un proyecto de la lista, agrega hitos con fechas de inicio/fin y haz clic sobre el ícono de estado para alternar entre *Pendiente*, *En Progreso* y *Completada*. El sistema recalcula el porcentaje de avance automáticamente.

#### 3.4. Estadísticas Financieras y Exportación
1. En el menú lateral, seleccionar **Estadísticas Financieras**.
2. **Filtros Temporales:** Filtra por *Histórico Total*, *Últimos 30 días*, *Último Trimestre* o *Este Año*.
3. **Métricas Clave:** Ingresos Totales, Gastos Totales, Balance Neto y Tasa de Rendimiento.
4. **Gráficos Interactivos:** Donut de gastos por responsable y gráfico de barras comparativo de ingresos vs gastos por mes.
5. **Exportación:** Botón **Exportar a Excel / CSV** para descargar reportes listos para auditoría contable.

#### 3.5. Métricas de Proyectos (Gantt & Tabla Ejecutiva)
1. En el menú lateral, seleccionar **Métricas de Proyectos**.
2. **Diagrama de Gantt:** Selecciona cualquier iniciativa para ver su línea de tiempo visual con fechas de inicio y cierre.
3. **Resumen Ejecutivo:** Tabla consolidada con buscador rápido, estado de avance y número de etapas activas.

---

### 4. PROCEDIMIENTO DE DESPLIEGUE CONTINUO (CI/CD)

#### 4.1. Flujo de Auto-Deploy
Cada vez que se sube un cambio a la rama `main` en GitHub (`lynxok/Lynxgestion`):
1. GitHub Actions ejecuta el workflow `.github/workflows/deploy.yml`.
2. Inyecta los secretos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Compila el código con Vite a `dist/` optimizado.
4. Publica automáticamente el contenido exclusivo de `dist/` en la rama **`gh-pages`** y GitHub Pages.

#### 4.2. Mantenimiento Preventivo Supabase (Keep-Alive)
- El workflow `.github/workflows/keep-alive.yml` se ejecuta automáticamente todos los días a las **12:00 UTC**.
- Realiza una consulta REST autenticada a la base de datos `Gestion LYNX`, evitando que Supabase suspenda el proyecto por inactividad.

#### 4.3. Política de Respaldo de Versiones
- Cada vez que se genera un nuevo compilado `dist`, el sistema realiza automáticamente una copia íntegra de la versión previa dentro del directorio `Versiones anteriores/dist_YYYYMMDD_HHMMSS`.
