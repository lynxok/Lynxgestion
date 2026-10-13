# MANUAL DE PROCEDIMIENTO Y OPERACIÓN DEL SISTEMA
## LYNX GESTIÓN (Edición Pro & Enterprise)

---

### 1. INFORMACIÓN GENERAL Y ARQUITECTURA
**LYNX Gestión** es una plataforma de alta gama para la administración ejecutiva de proyectos, control de movimientos financieros y análisis de rentabilidad/costeo en tiempo real.

- **Frontend:** React 18 + Vite (SPA) con arquitectura Glassmorphism 2.0 y soporte responsive.
- **Tipografía y Estilos:** Plus Jakarta Sans + JetBrains Mono, paleta Dark Slate con acentos dorados/ámbar LYNX.
- **Notificaciones:** Sistema nativo de Toasts flotantes con retroalimentación no invasiva.
- **Gráficos y Métricas:** Recharts con gradientes, tooltips personalizados y exportación a CSV/Excel.
- **Backend & Autenticación:** Supabase (`Gestion LYNX`) con Row Level Security (RLS), trigger de auto-asignación de roles, permisos por empresa y control de sesión única.
- **CI/CD & Hosting:** GitHub Actions (Compilación y auto-deploy a rama `gh-pages` + sincronización de producción en Hostinger/raíz de `main`).

---

### 2. ESTRUCTURA DE LA BASE DE DATOS (SUPABASE)

La base de datos `Gestion LYNX` está estructurada en torno a tablas relacionales protegidas mediante políticas RLS y multitenancy por empresa:

#### 2.1. Tabla `public.profiles` y `public.user_company_permissions`
Administra la identidad y los permisos granulares de los usuarios del sistema.
- `id` (UUID): Clave primaria, vinculada a `auth.users(id)`.
- `email` (TEXT): Correo electrónico del usuario.
- `role` (TEXT): Rol global asignado (`admin`, `director`, `user`).
- `is_approved` (BOOLEAN): Estado de aprobación para acceder al sistema.
- `current_session_id` (TEXT): Identificador único de la sesión activa en el navegador para evitar accesos concurrentes no autorizados.
- `user_company_permissions`: Relación N:M que asocia qué rol y permisos tiene el usuario dentro de cada empresa (`can_edit_projects`, `can_edit_movements`, etc.).

#### 2.2. Tabla `public.companies`
Define las unidades de negocio o entidades corporativas (ej. LYNX Central, Consultoría, etc.).
- Permite filtrar dinámicamente todo el sistema a través del selector de empresa en el encabezado.

#### 2.3. Tabla `public.cash_boxes` (Cajas & Cuentas)
Define las fuentes financieras de impacto (ej. Efectivo, Mercado Pago, Personal Pay, Cuentas Bancarias).
- Cada movimiento debita o acredita directamente sobre una caja específica.

#### 2.4. Tabla `public.projects` y `public.project_stages`
Registra los proyectos de la organización y sus hitos de desarrollo.
- `id` (UUID): Clave primaria.
- `name` (TEXT): Nombre comercial del proyecto.
- `objective` / `target_audience`: Alcance y beneficiarios.
- `progress` (NUMERIC): Porcentaje de avance ponderado (0 a 100%) calculado según etapas completadas.

#### 2.5. Tabla `public.movements` (Libro Mayor y Tesorería)
Controla el flujo de caja, la imputación a proyectos y la estructura de costos.
- `type` (`income` / `expense`): Tipo de transacción.
- `amount` (NUMERIC): Monto convertido a moneda base contable (**ARS**).
- `currency` (TEXT): Moneda original de la transacción (`ARS`, `USD`, `EUR`).
- `amount_currency` (NUMERIC): Monto en la divisa original (ej. 100 USD).
- `exchange_rate` (NUMERIC): Cotización o Tipo de Cambio aplicado respecto al ARS.
- `date` (DATE): Fecha efectiva o programada de la transacción.
- `project_id` (UUID): 
  - Para **Ingresos:** Obligatorio (asociado al proyecto facturado).
  - Para **Egresos:** Opcional. Si se completa, es un *Gasto Directo*; si es `null`, es un *Gasto Común de Consultora* distribuible entre proyectos.
- `cost_center_id` (UUID): Centro de costos imputado (ej. CC-01 Infraestructura & Servidores, CC-02 Comercial, etc.).
- `supplier_id` (UUID): Proveedor asignado al gasto.
- `expense_responsible_id` (UUID): Responsable que ejecutó o autorizó el gasto.
- `cash_box_id` (UUID): Caja de egreso o cobro.
- `is_recurring` (BOOLEAN): Indica si el gasto fue generado de forma periódica/programada.
- `recurring_interval` (TEXT): Intervalo de repetición (`weekly`, `biweekly`, `monthly`, `bimonthly`, `yearly`).
- `recurring_count` (INTEGER): Cantidad total de repeticiones o cuotas.
- `recurrence_group_id` (UUID): Identificador único que vincula las cuotas de una misma recurrencia.

---

### 3. MANUAL DE OPERACIÓN Y FLUJO DE USUARIO

#### 3.1. Acceso y Control de Empresa
1. Ingresar a `https://gestioneslynx.lnx.com.ar/`.
2. En la barra superior, seleccionar la **Empresa Activa** sobre la cual se desea operar o consultar métricas.

#### 3.2. Carga de Ingresos
1. En el menú lateral, seleccionar **Cargar Movimientos** y activar la pestaña **Ingreso / Cobro**.
2. **Caja de Destino:** Seleccionar dónde ingresa el dinero (Mercado Pago, Cuenta Bancaria, etc.).
3. **Proyecto Imputado (Obligatorio):** Todo ingreso debe asociarse a un proyecto creado.
4. **Categoría de Ingreso:** Hito, anticipo, abono recurrente o servicio profesional.
5. **Moneda y Tipo de Cambio:** 
   - Seleccionar `ARS`, `USD` o `EUR`.
   - Si se selecciona divisa extranjera, ingresar la cotización pactada del día. El sistema calcula en vivo el contravalor en pesos.
6. Guardar el registro.

#### 3.3. Carga de Gastos (Directos, Comunes y Recurrentes)
1. Activar la pestaña **Gasto / Egreso**.
2. **Caja de Salida:** Cuenta desde donde se realizó el pago.
3. **Centro de Costos:** Seleccionar la categoría contable (ej. Infraestructura & Servidores, Nómina, etc.).
4. **Responsable y Proveedor:** Indicar quién gestionó la compra y a qué proveedor corresponde.
5. **Imputación del Gasto:**
   - **Gasto Directo a Proyecto:** Seleccionar un proyecto específico. Ese monto se cargará al 100% como costo directo en la rentabilidad de dicho proyecto.
   - **Gasto Común de Consultora:** Dejar la opción *🌐 Gasto Común de Consultora (Todos los proyectos)*. Este gasto entrará en la bolsa de costos indirectos a prorratear.
6. **Repetir este gasto periódicamente:**
   - Si se trata de un servicio recurrente (hosting, licencias, alquileres), marcar la casilla de verificación.
   - Indicar la **Periodicidad** (Semanal, Quincenal, Mensual, Bimestral, Anual).
   - Indicar la **Cantidad de Cuotas/Repeticiones** (de 2 a 24). El sistema autogenerará el calendario de pagos con sus fechas proyectadas correlativas.
7. **Moneda Extranjera:** Si el proveedor cobra en dólares o euros (ej. Hostinger, AWS, Google Cloud), ingresar la divisa y el tipo de cambio oficial o de tarjeta correspondiente.
8. Guardar el movimiento.

#### 3.4. Matriz de Rentabilidad y Reglas de Asignación por Proyecto
1. En el menú lateral, seleccionar **Métricas de Proyectos** y luego la pestaña **Costos y Rentabilidad**.
2. **Reglas de Asignación de Gastos Comunes:**
   El selector superior permite modelar la rentabilidad según la política contable deseada:
   - **Prorrateo por Ingresos (% Facturación):** Los costos comunes de la consultora se distribuyen proporcionalmente según la participación de facturación de cada proyecto sobre el total.
   - **Prorrateo Equitativo (Partes Iguales):** Los costos indirectos se dividen en partes iguales entre la cantidad de proyectos activos.
   - **Solo Costos Directos:** No traslada gastos comunes a los proyectos; analiza exclusivamente el margen bruto de cada iniciativa.
3. **Matriz Detallada:**
   - Visualiza en tabla y tarjetas: Ingresos totales, Costo Directo, Costo Indirecto Asignado, Costo Total y **Margen Neto ($ y %)**.
   - Los proyectos con rentabilidad saludable se destacan en verde, mientras que desvíos o márgenes negativos se alertan en rojo.

---

### 4. PROCEDIMIENTO DE DESPLIEGUE CONTINUO Y RESPALDOS

#### 4.1. Respaldo Obligatorio de Compilados
- Ante cada compilación a producción, la carpeta `dist` previa se respalda en `Versiones anteriores/dist_YYYYMMDD_HHMMSS`.
- Permite restaurar cualquier versión histórica de forma instantánea ante contingencias.

#### 4.2. Flujo de Build y Sincronización a Hostinger
1. Vite compila el bundle productivo en `dist/` a partir de `src/main.jsx`.
2. Los artefactos resultantes se sincronizan directamente al directorio raíz del repositorio para su consumo inmediato por el servidor web de Hostinger.
3. Se realiza el commit y push a la rama `main` en GitHub (`lynxok/Lynxgestion`).
