/*
  Banco de preguntas de ejemplo (NO OFICIAL).
  Sustituye este banco importando un questions.json propio.
*/
window.SAMPLE_BANK = {
  meta: {
    version: "0.1.0",
    source: "Ejemplo educativo (contenido propio)",
    updatedAt: "2026-01-15",
    schema: "CGR_TEST_BANK_V1"
  },
  questions: [
    {
      id: "BAS-CONST-001",
      module: "Competencias básicas",
      axis: "Constitución Política",
      subAxis: "Principios y fines del Estado",
      difficulty: 1,
      type: "single",
      stem: "",
      question: "¿Cuál es el propósito principal de la acción de tutela en Colombia?",
      choices: [
        { id: "A", text: "Proteger derechos colectivos como el ambiente" },
        { id: "B", text: "Proteger derechos fundamentales cuando sean vulnerados o amenazados" },
        { id: "C", text: "Resolver conflictos contractuales entre particulares" },
        { id: "D", text: "Sustituir los procesos ordinarios en cualquier caso" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "La tutela es un mecanismo preferente y sumario para la protección inmediata de derechos fundamentales ante su vulneración o amenaza.",
      references: [{ type: "norma", text: "Constitución Política (acción de tutela)." }],
      tags: ["Constitución", "tutela"]
    },
    {
      id: "BAS-CGF-001",
      module: "Competencias básicas",
      axis: "Control fiscal",
      subAxis: "Concepto general",
      difficulty: 1,
      type: "single",
      stem: "",
      question: "En términos generales, el control fiscal se ejerce sobre:",
      choices: [
        { id: "A", text: "Decisiones judiciales y sentencias" },
        { id: "B", text: "La gestión fiscal y el manejo de recursos públicos" },
        { id: "C", text: "Actos médicos en hospitales públicos" },
        { id: "D", text: "La vida privada de los servidores públicos" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "El control fiscal se enfoca en la gestión fiscal: recaudo, administración, inversión, gasto y custodia de recursos y bienes públicos.",
      references: [{ type: "norma", text: "Constitución Política (control fiscal)." }],
      tags: ["CGR", "control fiscal"]
    },
    {
      id: "BAS-PET-001",
      module: "Competencias básicas",
      axis: "Atención al ciudadano",
      subAxis: "Derecho de petición",
      difficulty: 1,
      type: "single",
      stem: "",
      question: "El derecho de petición permite a las personas:",
      choices: [
        { id: "A", text: "Obtener siempre una respuesta favorable" },
        { id: "B", text: "Solicitar información, documentos o decisiones y recibir respuesta de la autoridad" },
        { id: "C", text: "Excluirse de cumplir requisitos legales" },
        { id: "D", text: "Acceder sin restricciones a datos personales de terceros" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "El núcleo es poder presentar solicitudes respetuosas y obtener respuesta oportuna y de fondo conforme a la ley.",
      references: [{ type: "norma", text: "Constitución Política (derecho de petición) y ley aplicable." }],
      tags: ["PQRS", "derecho de petición"]
    },
    {
      id: "BAS-GD-001",
      module: "Competencias básicas",
      axis: "Gestión documental",
      subAxis: "Principios",
      difficulty: 2,
      type: "single",
      stem: "",
      question: "En gestión documental, ¿qué describe mejor el " +
        "concepto de trazabilidad del documento?",
      choices: [
        { id: "A", text: "Que el documento tenga un diseño estético" },
        { id: "B", text: "Que se pueda rastrear su creación, cambios, responsables y ubicación a lo largo del ciclo de vida" },
        { id: "C", text: "Que siempre se imprima en papel" },
        { id: "D", text: "Que solo exista una copia física" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "Trazabilidad implica registro y seguimiento de eventos del documento para asegurar control, integridad y auditoría.",
      references: [{ type: "guia", text: "Buenas prácticas de gestión documental y archivo." }],
      tags: ["documentos", "archivo"]
    },

    {
      id: "TI-SEC-001",
      module: "Competencias específicas (TI)",
      axis: "Ciberseguridad",
      subAxis: "Controles y riesgo",
      difficulty: 2,
      type: "single",
      stem: "Escenario: una entidad maneja información sensible y necesita reducir riesgo de acceso no autorizado.",
      question: "¿Cuál control es más directo para disminuir el riesgo de que un usuario acceda a información que no necesita?",
      choices: [
        { id: "A", text: "Control de acceso basado en roles (RBAC) y principio de mínimo privilegio" },
        { id: "B", text: "Aumentar el ancho de banda" },
        { id: "C", text: "Cambiar el proveedor de correo" },
        { id: "D", text: "Instalar más impresoras" }
      ],
      answer: { correctChoiceId: "A" },
      explanation: "RBAC + mínimo privilegio reduce superficie de acceso: cada usuario solo accede a lo necesario para su función.",
      references: [{ type: "estandar", text: "ISO/IEC 27001/27002 (controles de acceso) — referencia general." }],
      tags: ["seguridad", "acceso"]
    },
    {
      id: "TI-ITIL-001",
      module: "Competencias específicas (TI)",
      axis: "ITIL",
      subAxis: "Gestión de incidentes",
      difficulty: 2,
      type: "single",
      stem: "",
      question: "El objetivo principal de la gestión de incidentes (ITIL) es:",
      choices: [
        { id: "A", text: "Eliminar definitivamente la causa raíz de todos los problemas" },
        { id: "B", text: "Restaurar el servicio lo antes posible y minimizar impacto al negocio" },
        { id: "C", text: "Redactar contratos con proveedores" },
        { id: "D", text: "Crear manuales de usuario" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "Incidentes se enfocan en restauración rápida del servicio; la causa raíz suele abordarse en gestión de problemas.",
      references: [{ type: "guia", text: "ITIL (conceptos generales): incident vs problem." }],
      tags: ["ITIL", "incidentes"]
    },
    {
      id: "TI-ITIL-002",
      module: "Competencias específicas (TI)",
      axis: "ITIL",
      subAxis: "Gestión de problemas",
      difficulty: 3,
      type: "single",
      stem: "",
      question: "¿Qué resultado es típico de la gestión de problemas?",
      choices: [
        { id: "A", text: "Registro de conocimiento (Known Error) y workaround documentado" },
        { id: "B", text: "Lista de compras de hardware" },
        { id: "C", text: "Mapa de procesos de talento humano" },
        { id: "D", text: "Plan de vacaciones" }
      ],
      answer: { correctChoiceId: "A" },
      explanation: "Gestión de problemas busca causa raíz, reduce recurrencia y produce registros de errores conocidos y soluciones temporales (workarounds).",
      references: [{ type: "guia", text: "ITIL (conceptos generales): problem management." }],
      tags: ["ITIL", "problemas"]
    },
    {
      id: "TI-BACKUP-001",
      module: "Competencias específicas (TI)",
      axis: "Respaldo y recuperación",
      subAxis: "RPO / RTO",
      difficulty: 3,
      type: "single",
      stem: "",
      question: "En continuidad de TI, el RPO (Recovery Point Objective) se refiere a:",
      choices: [
        { id: "A", text: "Tiempo máximo para recuperar el servicio" },
        { id: "B", text: "Punto máximo aceptable de pérdida de datos medido en tiempo" },
        { id: "C", text: "Costo máximo del centro de datos" },
        { id: "D", text: "Cantidad de usuarios con acceso" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "RPO define cuánta pérdida de datos (en tiempo) es tolerable. RTO define el tiempo para restaurar el servicio.",
      references: [{ type: "guia", text: "Continuidad del negocio / DRP (conceptos RPO/RTO)." }],
      tags: ["backup", "continuidad"]
    },
    {
      id: "TI-AUDSI-001",
      module: "Competencias específicas (TI)",
      axis: "Auditoría de sistemas de información",
      subAxis: "Evidencia",
      difficulty: 2,
      type: "single",
      stem: "Escenario: se audita el control de accesos a una base de datos institucional.",
      question: "¿Cuál evidencia es más fuerte para verificar que el control se aplica en operación?",
      choices: [
        { id: "A", text: "Una política firmada sin registros de ejecución" },
        { id: "B", text: "Logs/bitácoras de acceso y evidencia de revisiones periódicas" },
        { id: "C", text: "Un correo informal del administrador" },
        { id: "D", text: "Un organigrama" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "En auditoría, la evidencia operativa (logs, revisiones, trazabilidad) suele ser más concluyente que solo documentación declarativa.",
      references: [{ type: "guia", text: "Buenas prácticas de auditoría TI: evidencia suficiente y adecuada." }],
      tags: ["auditoria", "evidencia"]
    },
    {
      id: "TI-DB-001",
      module: "Competencias específicas (TI)",
      axis: "Bases de datos",
      subAxis: "Normalización",
      difficulty: 2,
      type: "single",
      stem: "",
      question: "¿Cuál es un beneficio principal de la normalización en bases de datos relacionales?",
      choices: [
        { id: "A", text: "Aumenta redundancia para mejorar velocidad" },
        { id: "B", text: "Reduce redundancia y evita anomalías de inserción/actualización/eliminación" },
        { id: "C", text: "Garantiza cifrado automáticamente" },
        { id: "D", text: "Obliga a usar NoSQL" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "Normalizar busca consistencia y menor redundancia, reduciendo errores y anomalías en operaciones CRUD.",
      references: [{ type: "texto", text: "Conceptos generales de modelos relacionales." }],
      tags: ["BD", "normalizacion"]
    },
    {
      id: "TI-API-001",
      module: "Competencias específicas (TI)",
      axis: "Arquitectura / Integración",
      subAxis: "APIs",
      difficulty: 2,
      type: "single",
      stem: "",
      question: "Una buena práctica común al diseñar una API REST es:",
      choices: [
        { id: "A", text: "Usar verbos en la ruta: /getUser" },
        { id: "B", text: "Usar recursos en la ruta: /users/{id} y métodos HTTP" },
        { id: "C", text: "Retornar siempre 200 aunque haya error" },
        { id: "D", text: "No versionar nunca" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "En REST se modelan recursos y se usan métodos HTTP (GET, POST, PUT, DELETE), con códigos de estado apropiados.",
      references: [{ type: "guia", text: "Buenas prácticas de diseño de APIs REST (general)." }],
      tags: ["REST", "API"]
    },
    {
      id: "TI-K8S-001",
      module: "Competencias específicas (TI)",
      axis: "Contenerización",
      subAxis: "Kubernetes",
      difficulty: 2,
      type: "single",
      stem: "",
      question: "En Kubernetes, ¿qué recurso se usa típicamente para gestionar el escalamiento y actualizaciones declarativas de réplicas?",
      choices: [
        { id: "A", text: "Deployment" },
        { id: "B", text: "Namespace" },
        { id: "C", text: "ConfigMap" },
        { id: "D", text: "Secret" }
      ],
      answer: { correctChoiceId: "A" },
      explanation: "Deployment administra ReplicaSets y soporta rolling updates/rollback para cargas stateless.",
      references: [{ type: "doc", text: "Documentación general de Kubernetes (Deployment)." }],
      tags: ["kubernetes", "deployment"]
    },
    {
      id: "TI-SEC-002",
      module: "Competencias específicas (TI)",
      axis: "Ciberseguridad",
      subAxis: "Autenticación",
      difficulty: 2,
      type: "single",
      stem: "",
      question: "¿Cuál práctica mejora significativamente la seguridad de autenticación para sistemas críticos?",
      choices: [
        { id: "A", text: "Permitir contraseñas cortas para facilidad" },
        { id: "B", text: "Usar autenticación multifactor (MFA)" },
        { id: "C", text: "Compartir cuentas entre equipos" },
        { id: "D", text: "Deshabilitar logs de seguridad" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "MFA reduce el riesgo cuando credenciales se filtran, al exigir un segundo factor.",
      references: [{ type: "guia", text: "Buenas prácticas de seguridad: MFA." }],
      tags: ["MFA", "seguridad"]
    },

    {
      id: "COMP-ETI-001",
      module: "Competencias comportamentales",
      axis: "Integridad",
      subAxis: "Ética pública",
      difficulty: 2,
      type: "single",
      stem: "Escenario: detectas que un compañero propone 'ajustar' un informe para que no evidencie una debilidad.",
      question: "¿Qué respuesta es más consistente con integridad y responsabilidad pública?",
      choices: [
        { id: "A", text: "Aceptar para evitar conflictos" },
        { id: "B", text: "Documentar la situación, mantener veracidad y escalar por canales adecuados" },
        { id: "C", text: "Ignorar y no participar" },
        { id: "D", text: "Publicarlo en redes sociales" }
      ],
      answer: { correctChoiceId: "B" },
      explanation: "La integridad exige veracidad, trazabilidad y uso de canales institucionales para gestionar riesgos y conflictos.",
      references: [{ type: "competencia", text: "Competencias comportamentales: integridad." }],
      tags: ["integridad", "ética"]
    }
  ]
};
