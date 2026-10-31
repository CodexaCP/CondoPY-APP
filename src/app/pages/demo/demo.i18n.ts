import { Dict } from '../../core/lang.service';

// Textos de la demo del Encargado en español, portugués e inglés. Los datos ficticios (demo.data.ts) guardan identificadores
// y aquí está cómo se llama cada cosa en cada idioma.

export type TaskId = 'pago' | 'reclamo' | 'reserva';
export type PayStatusId = 'Pending' | 'UnderReview' | 'Approved' | 'Rejected';
export type ClaimStatusId = 'Pendiente' | 'EnProceso' | 'Resuelto';
export type ReservationStatusId = 'Pending' | 'Approved' | 'Rejected';
export type MethodId = 'transfer' | 'deposit';
export type RejectReasonId = 'unreadable' | 'amount' | 'notInBank';
export type PainId = 'collections' | 'expenses' | 'accounting' | 'assembly' | 'communication';
export type LockedId = 'conciliacion' | 'marketplace' | 'plan' | 'notificaciones' | 'general';
export type ContactKind = 'presupuesto' | 'demostracion' | 'planes';

const ES = {
  months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  periodName: (month: string, year: number) => `Expensas de ${month} ${year}`,
  buildingName: 'Edificio Torre Mirador',
  methods: { transfer: 'Transferencia', deposit: 'Depósito' } as Record<MethodId, string>,
  bankReceipt: { transfer: 'Transferencia bancaria', deposit: 'Depósito bancario' } as Record<MethodId, string>,
  rejectReasons: { unreadable: 'El comprobante no se lee bien', amount: 'El monto no coincide con el comprobante', notInBank: 'El pago no figura en el banco' } as Record<RejectReasonId, string>,
  claims: {
    c1: { category: 'Mantenimiento', description: 'Hay una gotera en el techo del estacionamiento, justo sobre mi cochera.' },
    c2: { category: 'Convivencia', description: 'Ruido de música fuerte pasada la medianoche en el piso 6 el fin de semana.' },
    c3: { category: 'Mantenimiento', description: 'La luz del pasillo del segundo piso está quemada desde hace tres días.' },
    c4: { category: 'Seguridad', description: 'El portón del garaje no cierra bien y queda abierto un rato.' }
  } as Record<string, { category: string; description: string }>,
  spaces: { r1: 'Salón de eventos', r2: 'Quincho', r3: 'Piscina', r4: 'Salón de eventos' } as Record<string, string>,
  payStatus: { Pending: 'Por revisar', UnderReview: 'En revisión', Approved: 'Aprobado', Rejected: 'Rechazado' } as Record<PayStatusId, string>,
  claimStatus: { Pendiente: 'Pendiente', EnProceso: 'En proceso', Resuelto: 'Resuelto' } as Record<ClaimStatusId, string>,
  reservationStatus: { Pending: 'Por revisar', Approved: 'Aprobada', Rejected: 'Rechazada' } as Record<ReservationStatusId, string>,
  tasks: {
    pago: { title: 'Aprueba un pago', hint: 'Abrí un pago, mirá el comprobante y aprobalo o rechazalo.' },
    reclamo: { title: 'Resuelve un reclamo', hint: 'Pasá un reclamo a «En proceso» o marcalo como resuelto.' },
    reserva: { title: 'Responde una reserva', hint: 'Aprobá o rechazá una reserva de un espacio común.' }
  } as Record<TaskId, { title: string; hint: string }>,
  diagnosis: {
    units: { title: '¿Cuántas unidades administrás?', options: [['u30', 'Hasta 30'], ['u100', '31 a 100'], ['u300', '101 a 300'], ['u300p', 'Más de 300']] as [string, string][] },
    method: { title: '¿Cómo llevás hoy las expensas?', options: [['excel', 'Planillas de Excel'], ['software', 'Otro software'], ['paper', 'Cuaderno o papel'], ['accountant', 'Lo lleva mi contador']] as [string, string][] },
    pain: { title: '¿Qué te quita más tiempo o te preocupa más?', options: [['collections', 'Cobrar y la morosidad'], ['expenses', 'Controlar gastos y proveedores'], ['accounting', 'La contabilidad'], ['assembly', 'Rendir cuentas en la asamblea'], ['communication', 'Comunicarme con propietarios']] as [string, string][] }
  },
  recommendation: {
    collections: 'Expensas con recargo por mora automático, estados de cuenta por unidad y el informe de morosidad.',
    expenses: 'Gastos por rubro, proveedores y cuentas por pagar, con el impacto contable al instante.',
    accounting: 'Libro diario, libro mayor, balance y libro de compras con IVA, listos para tu contador.',
    assembly: 'Informe de asamblea, presupuesto contra lo real y fondo de reserva.',
    communication: 'Comunicados, reclamos, avisos en la app y votaciones.'
  } as Record<PainId, string>,
  locked: {
    conciliacion: { title: 'Caja y bancos · conciliación', text: 'Concilia cobros y pagos contra el extracto del banco, directo desde el celular.' },
    marketplace: { title: 'Marketplace de espacios', text: 'Alquiler de espacios comunes con pagos, reembolsos y reclamos a cargo del Encargado.' },
    plan: { title: 'Mi plan', text: 'Consultá el plan del edificio, sus vencimientos y pagá la renovación desde la app.' },
    notificaciones: { title: 'Avisos en tiempo real', text: 'Recibís una notificación en el celular apenas entra un pago, un reclamo o una reserva.' },
    general: { title: 'Expenses para tu edificio', text: 'Pagos, reclamos, reservas, caja y contabilidad, todo conectado entre el administrador, el Encargado y los propietarios.' }
  } as Record<LockedId, { title: string; text: string }>,
  whatsapp: {
    intro: {
      presupuesto: 'Hola, probé la demo de la app de Expenses y quiero pedir un presupuesto para mi edificio.',
      demostracion: 'Hola, probé la demo de la app de Expenses y quiero solicitar una demostración personalizada.',
      planes: 'Hola, probé la demo de la app de Expenses y quiero consultar planes y condiciones.'
    } as Record<ContactKind, string>,
    tried: (list: string) => ` En la demo probé: ${list}.`,
    profile: (units: string, method: string, pain: string) => ` Administro ${units} unidades, hoy llevo las expensas con ${method} y lo que más me preocupa es: ${pain}.`
  },

  backAria: 'Volver al ingreso',
  title: 'Demo · Encargado',
  want: 'Quiero esto',
  banner: 'Demostración con datos ficticios · nada se guarda',
  tryIt: 'Probá lo que hace el Encargado',
  progress: (done: number, total: number) => `${done} de ${total}`,
  attention: 'Requieren tu atención',
  paymentsToReview: 'Pagos por revisar',
  paymentsToReviewSub: 'Comprobantes enviados por propietarios',
  claimsPending: 'Reclamos pendientes',
  claimsPendingSub: 'Esperan respuesta',
  reservationsToApprove: 'Reservas por aprobar',
  reservationsToApproveSub: 'Salón, quincho y piscina',
  issued: 'Emitido',
  collected: 'Cobrado',
  collectionRate: 'Cobranza',
  percent: (n: number) => `${n} %`,
  arrears: 'Morosidad',
  overdueBalance: 'Saldo vencido',
  unitsInArrears: 'Unidades en mora',
  cashBanks: 'Caja y bancos',
  reconciliation: 'Conciliación bancaria',
  cashBalance: (amount: string) => `Saldo en caja y bancos ${amount}`,
  segPay: { pending: 'Por revisar', review: 'En revisión', done: 'Resueltos' },
  noPayments: 'No hay pagos en esta lista.',
  segClaim: { Pendiente: 'Pendientes', EnProceso: 'En proceso', Resuelto: 'Resueltos' } as Record<ClaimStatusId, string>,
  noClaims: 'No hay reclamos en este estado.',
  reservationsTitle: 'Reservas de espacios comunes',
  unit: (u: string) => `Unidad ${u}`,
  day: 'Día',
  time: 'Horario',
  guests: 'Invitados',
  approve: 'Aprobar',
  reject: 'Rechazar',
  moreName: 'Encargado de ejemplo',
  moreItems: { notifications: 'Notificaciones', marketplace: 'Marketplace · pagos, reembolsos y reclamos', reconciliation: 'Caja y bancos · conciliación', plan: 'Mi plan', exit: 'Salir de la demo' },
  wantCardTitle: '¿Querés esto para tu edificio?',
  wantCardText: 'Podemos adaptar Expenses a tu administración.',
  talk: 'Hablar con Expenses',
  paymentDate: 'Fecha del pago',
  method: 'Medio',
  declared: 'Monto declarado',
  verified: 'Monto verificado',
  rejectionReason: 'Motivo del rechazo',
  receipt: 'Comprobante',
  verifyApprove: 'Verificar y aprobar',
  approvePayment: 'Aprobar pago',
  verifyOnly: 'Solo verificar monto',
  rejectReasonTitle: 'Motivo del rechazo',
  confirmReject: 'Confirmar rechazo',
  back: 'Volver',
  claimant: 'Reclamante',
  created: 'Creado',
  toInProgress: 'Pasar a en proceso',
  markResolved: 'Marcar como resuelto',
  ctaDoneTitle: '¡Probaste lo esencial!',
  ctaTodoTitle: '¿Listo para administrar tu propio edificio?',
  ctaLocked: (text: string) => `${text} Está disponible en la versión completa.`,
  ctaLead: 'Ya viste cómo trabaja el Encargado desde el celular. Contanos tu caso y te ayudamos a evaluar cómo adaptar Expenses a tu administración.',
  forYou: 'Para vos, Expenses ofrece:',
  ctaDemo: 'Solicitar una demostración personalizada',
  ctaPlans: 'Consultar planes y condiciones',
  ctaQuote: 'Pedir presupuesto por WhatsApp',
  keepExploring: 'Seguir explorando',
  tabs: { inicio: 'Inicio', pagos: 'Pagos', reclamos: 'Reclamos', reservas: 'Reservas', mas: 'Más' }
};

export type DemoTx = typeof ES;

const PT: DemoTx = {
  months: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  periodName: (month: string, year: number) => `Taxas de ${month} de ${year}`,
  buildingName: 'Edifício Torre Mirador',
  methods: { transfer: 'Transferência', deposit: 'Depósito' },
  bankReceipt: { transfer: 'Transferência bancária', deposit: 'Depósito bancário' },
  rejectReasons: { unreadable: 'O comprovante não está legível', amount: 'O valor não confere com o comprovante', notInBank: 'O pagamento não aparece no banco' },
  claims: {
    c1: { category: 'Manutenção', description: 'Há uma goteira no teto do estacionamento, bem em cima da minha vaga.' },
    c2: { category: 'Convivência', description: 'Música alta depois da meia-noite no 6.º andar no fim de semana.' },
    c3: { category: 'Manutenção', description: 'A luz do corredor do segundo andar está queimada há três dias.' },
    c4: { category: 'Segurança', description: 'O portão da garagem não fecha bem e fica aberto por um tempo.' }
  },
  spaces: { r1: 'Salão de festas', r2: 'Churrasqueira', r3: 'Piscina', r4: 'Salão de festas' },
  payStatus: { Pending: 'A revisar', UnderReview: 'Em revisão', Approved: 'Aprovado', Rejected: 'Rejeitado' },
  claimStatus: { Pendiente: 'Pendente', EnProceso: 'Em andamento', Resuelto: 'Resolvido' },
  reservationStatus: { Pending: 'A revisar', Approved: 'Aprovada', Rejected: 'Rejeitada' },
  tasks: {
    pago: { title: 'Aprove um pagamento', hint: 'Abra um pagamento, veja o comprovante e aprove ou rejeite.' },
    reclamo: { title: 'Resolva uma reclamação', hint: 'Passe uma reclamação para «Em andamento» ou marque como resolvida.' },
    reserva: { title: 'Responda a uma reserva', hint: 'Aprove ou rejeite a reserva de uma área comum.' }
  },
  diagnosis: {
    units: { title: 'Quantas unidades você administra?', options: [['u30', 'Até 30'], ['u100', '31 a 100'], ['u300', '101 a 300'], ['u300p', 'Mais de 300']] },
    method: { title: 'Como você controla as taxas hoje?', options: [['excel', 'Planilhas de Excel'], ['software', 'Outro software'], ['paper', 'Caderno ou papel'], ['accountant', 'Meu contador cuida disso']] },
    pain: { title: 'O que mais toma o seu tempo ou preocupa você?', options: [['collections', 'Cobrar e a inadimplência'], ['expenses', 'Controlar despesas e fornecedores'], ['accounting', 'A contabilidade'], ['assembly', 'Prestar contas na assembleia'], ['communication', 'Comunicar-me com os proprietários']] }
  },
  recommendation: {
    collections: 'Taxas com multa e juros por atraso automáticos, extratos por unidade e o relatório de inadimplência.',
    expenses: 'Despesas por categoria, fornecedores e contas a pagar, com o impacto contábil na hora.',
    accounting: 'Livro diário, livro razão, balanço e livro de compras com IVA, prontos para o seu contador.',
    assembly: 'Relatório de assembleia, orçamento contra o realizado e fundo de reserva.',
    communication: 'Comunicados, reclamações, avisos no app e votações.'
  },
  locked: {
    conciliacion: { title: 'Caixa e bancos · conciliação', text: 'Concilie recebimentos e pagamentos com o extrato do banco, direto do celular.' },
    marketplace: { title: 'Marketplace de espaços', text: 'Aluguel de áreas comuns com pagamentos, reembolsos e reclamações a cargo do encarregado.' },
    plan: { title: 'Meu plano', text: 'Consulte o plano do edifício, seus vencimentos e pague a renovação pelo app.' },
    notificaciones: { title: 'Avisos em tempo real', text: 'Você recebe uma notificação no celular assim que entra um pagamento, uma reclamação ou uma reserva.' },
    general: { title: 'Expenses para o seu edifício', text: 'Pagamentos, reclamações, reservas, caixa e contabilidade, tudo conectado entre o administrador, o encarregado e os proprietários.' }
  },
  whatsapp: {
    intro: {
      presupuesto: 'Olá, testei a demo do app da Expenses e quero pedir um orçamento para o meu condomínio.',
      demostracion: 'Olá, testei a demo do app da Expenses e quero solicitar uma demonstração personalizada.',
      planes: 'Olá, testei a demo do app da Expenses e quero saber sobre planos e condições.'
    },
    tried: (list: string) => ` Na demo testei: ${list}.`,
    profile: (units: string, method: string, pain: string) => ` Administro ${units} unidades, hoje controlo as taxas com ${method} e o que mais me preocupa é: ${pain}.`
  },

  backAria: 'Voltar ao login',
  title: 'Demo · Encarregado',
  want: 'Quero isto',
  banner: 'Demonstração com dados fictícios · nada é salvo',
  tryIt: 'Teste o que o encarregado faz',
  progress: (done: number, total: number) => `${done} de ${total}`,
  attention: 'Precisam da sua atenção',
  paymentsToReview: 'Pagamentos a revisar',
  paymentsToReviewSub: 'Comprovantes enviados por proprietários',
  claimsPending: 'Reclamações pendentes',
  claimsPendingSub: 'Aguardam resposta',
  reservationsToApprove: 'Reservas a aprovar',
  reservationsToApproveSub: 'Salão, churrasqueira e piscina',
  issued: 'Emitido',
  collected: 'Recebido',
  collectionRate: 'Cobrança',
  percent: (n: number) => `${n}%`,
  arrears: 'Inadimplência',
  overdueBalance: 'Saldo vencido',
  unitsInArrears: 'Unidades inadimplentes',
  cashBanks: 'Caixa e bancos',
  reconciliation: 'Conciliação bancária',
  cashBalance: (amount: string) => `Saldo em caixa e bancos ${amount}`,
  segPay: { pending: 'A revisar', review: 'Em revisão', done: 'Resolvidos' },
  noPayments: 'Não há pagamentos nesta lista.',
  segClaim: { Pendiente: 'Pendentes', EnProceso: 'Em andamento', Resuelto: 'Resolvidas' },
  noClaims: 'Não há reclamações neste estado.',
  reservationsTitle: 'Reservas de áreas comuns',
  unit: (u: string) => `Unidade ${u}`,
  day: 'Dia',
  time: 'Horário',
  guests: 'Convidados',
  approve: 'Aprovar',
  reject: 'Rejeitar',
  moreName: 'Encarregado de exemplo',
  moreItems: { notifications: 'Notificações', marketplace: 'Marketplace · pagamentos, reembolsos e reclamações', reconciliation: 'Caixa e bancos · conciliação', plan: 'Meu plano', exit: 'Sair da demo' },
  wantCardTitle: 'Quer isto para o seu edifício?',
  wantCardText: 'Podemos adaptar a Expenses à sua administração.',
  talk: 'Falar com a Expenses',
  paymentDate: 'Data do pagamento',
  method: 'Meio',
  declared: 'Valor declarado',
  verified: 'Valor verificado',
  rejectionReason: 'Motivo da rejeição',
  receipt: 'Comprovante',
  verifyApprove: 'Verificar e aprovar',
  approvePayment: 'Aprovar pagamento',
  verifyOnly: 'Só verificar o valor',
  rejectReasonTitle: 'Motivo da rejeição',
  confirmReject: 'Confirmar rejeição',
  back: 'Voltar',
  claimant: 'Reclamante',
  created: 'Criada',
  toInProgress: 'Passar para em andamento',
  markResolved: 'Marcar como resolvida',
  ctaDoneTitle: 'Você testou o essencial!',
  ctaTodoTitle: 'Pronto para administrar o seu próprio edifício?',
  ctaLocked: (text: string) => `${text} Está disponível na versão completa.`,
  ctaLead: 'Você já viu como o encarregado trabalha pelo celular. Conte-nos o seu caso e ajudamos a avaliar como adaptar a Expenses à sua administração.',
  forYou: 'Para você, a Expenses oferece:',
  ctaDemo: 'Solicitar uma demonstração personalizada',
  ctaPlans: 'Consultar planos e condições',
  ctaQuote: 'Pedir orçamento pelo WhatsApp',
  keepExploring: 'Continuar explorando',
  tabs: { inicio: 'Início', pagos: 'Pagamentos', reclamos: 'Reclamações', reservas: 'Reservas', mas: 'Mais' }
};

const EN: DemoTx = {
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  periodName: (month: string, year: number) => `Fees for ${month} ${year}`,
  buildingName: 'Torre Mirador Building',
  methods: { transfer: 'Bank transfer', deposit: 'Deposit' },
  bankReceipt: { transfer: 'Bank transfer', deposit: 'Bank deposit' },
  rejectReasons: { unreadable: 'The proof of payment is hard to read', amount: 'The amount does not match the proof of payment', notInBank: 'The payment does not appear at the bank' },
  claims: {
    c1: { category: 'Maintenance', description: 'There is a leak in the parking lot ceiling, right above my parking space.' },
    c2: { category: 'Coexistence', description: 'Loud music after midnight on the 6th floor over the weekend.' },
    c3: { category: 'Maintenance', description: 'The second-floor hallway light has been burnt out for three days.' },
    c4: { category: 'Security', description: 'The garage gate does not close properly and stays open for a while.' }
  },
  spaces: { r1: 'Event hall', r2: 'Barbecue area', r3: 'Swimming pool', r4: 'Event hall' },
  payStatus: { Pending: 'To review', UnderReview: 'Under review', Approved: 'Approved', Rejected: 'Rejected' },
  claimStatus: { Pendiente: 'Pending', EnProceso: 'In progress', Resuelto: 'Resolved' },
  reservationStatus: { Pending: 'To review', Approved: 'Approved', Rejected: 'Rejected' },
  tasks: {
    pago: { title: 'Approve a payment', hint: 'Open a payment, look at the proof and approve or reject it.' },
    reclamo: { title: 'Resolve a complaint', hint: 'Move a complaint to "In progress" or mark it as resolved.' },
    reserva: { title: 'Answer a booking', hint: 'Approve or reject a common-area booking.' }
  },
  diagnosis: {
    units: { title: 'How many units do you manage?', options: [['u30', 'Up to 30'], ['u100', '31 to 100'], ['u300', '101 to 300'], ['u300p', 'More than 300']] },
    method: { title: 'How do you handle fees today?', options: [['excel', 'Excel spreadsheets'], ['software', 'Other software'], ['paper', 'Notebook or paper'], ['accountant', 'My accountant handles it']] },
    pain: { title: 'What takes most of your time or worries you most?', options: [['collections', 'Collections and arrears'], ['expenses', 'Controlling expenses and suppliers'], ['accounting', 'Accounting'], ['assembly', 'Reporting to the owners\' meeting'], ['communication', 'Communicating with owners']] }
  },
  recommendation: {
    collections: 'Fees with automatic late charges, account statements per unit and the arrears report.',
    expenses: 'Expenses by category, suppliers and accounts payable, with the accounting impact instantly.',
    accounting: 'General journal, general ledger, balance sheet and purchases ledger with VAT, ready for your accountant.',
    assembly: 'Owners\' meeting report, budget versus actual and reserve fund.',
    communication: 'Announcements, complaints, in-app notices and votes.'
  },
  locked: {
    conciliacion: { title: 'Cash and banks · reconciliation', text: 'Reconcile collections and payments against the bank statement, straight from your phone.' },
    marketplace: { title: 'Spaces marketplace', text: 'Common-area rentals with payments, refunds and complaints handled by the on-site manager.' },
    plan: { title: 'My plan', text: 'Check the building\'s plan, its due dates and pay the renewal from the app.' },
    notificaciones: { title: 'Real-time alerts', text: 'You get a notification on your phone as soon as a payment, a complaint or a booking comes in.' },
    general: { title: 'Expenses for your building', text: 'Payments, complaints, bookings, cash and accounting, all connected between the administrator, the on-site manager and the owners.' }
  },
  whatsapp: {
    intro: {
      presupuesto: 'Hello, I tried the Expenses app demo and I would like to request a quote for my building.',
      demostracion: 'Hello, I tried the Expenses app demo and I would like to request a personalized demonstration.',
      planes: 'Hello, I tried the Expenses app demo and I would like to ask about plans and conditions.'
    },
    tried: (list: string) => ` In the demo I tried: ${list}.`,
    profile: (units: string, method: string, pain: string) => ` I manage ${units} units, I currently handle fees with ${method} and what worries me most is: ${pain}.`
  },

  backAria: 'Back to log in',
  title: 'Demo · On-site manager',
  want: 'I want this',
  banner: 'Demo with fictitious data · nothing is saved',
  tryIt: 'Try what the on-site manager does',
  progress: (done: number, total: number) => `${done} of ${total}`,
  attention: 'Need your attention',
  paymentsToReview: 'Payments to review',
  paymentsToReviewSub: 'Proofs sent by owners',
  claimsPending: 'Pending complaints',
  claimsPendingSub: 'Waiting for a reply',
  reservationsToApprove: 'Bookings to approve',
  reservationsToApproveSub: 'Event hall, barbecue area and pool',
  issued: 'Billed',
  collected: 'Collected',
  collectionRate: 'Collection',
  percent: (n: number) => `${n}%`,
  arrears: 'Arrears',
  overdueBalance: 'Overdue balance',
  unitsInArrears: 'Units in arrears',
  cashBanks: 'Cash and banks',
  reconciliation: 'Bank reconciliation',
  cashBalance: (amount: string) => `Cash and bank balance ${amount}`,
  segPay: { pending: 'To review', review: 'Under review', done: 'Resolved' },
  noPayments: 'There are no payments in this list.',
  segClaim: { Pendiente: 'Pending', EnProceso: 'In progress', Resuelto: 'Resolved' },
  noClaims: 'There are no complaints in this status.',
  reservationsTitle: 'Common-area bookings',
  unit: (u: string) => `Unit ${u}`,
  day: 'Day',
  time: 'Time',
  guests: 'Guests',
  approve: 'Approve',
  reject: 'Reject',
  moreName: 'Sample on-site manager',
  moreItems: { notifications: 'Notifications', marketplace: 'Marketplace · payments, refunds and complaints', reconciliation: 'Cash and banks · reconciliation', plan: 'My plan', exit: 'Exit the demo' },
  wantCardTitle: 'Want this for your building?',
  wantCardText: 'We can adapt Expenses to your administration.',
  talk: 'Talk to Expenses',
  paymentDate: 'Payment date',
  method: 'Method',
  declared: 'Declared amount',
  verified: 'Verified amount',
  rejectionReason: 'Reason for rejection',
  receipt: 'Proof of payment',
  verifyApprove: 'Verify and approve',
  approvePayment: 'Approve payment',
  verifyOnly: 'Only verify the amount',
  rejectReasonTitle: 'Reason for rejection',
  confirmReject: 'Confirm rejection',
  back: 'Back',
  claimant: 'Complainant',
  created: 'Created',
  toInProgress: 'Move to in progress',
  markResolved: 'Mark as resolved',
  ctaDoneTitle: 'You tried the essentials!',
  ctaTodoTitle: 'Ready to manage your own building?',
  ctaLocked: (text: string) => `${text} It is available in the full version.`,
  ctaLead: 'You have seen how the on-site manager works from the phone. Tell us about your case and we will help you evaluate how to adapt Expenses to your administration.',
  forYou: 'For you, Expenses offers:',
  ctaDemo: 'Request a personalized demo',
  ctaPlans: 'Ask about plans and conditions',
  ctaQuote: 'Request a quote on WhatsApp',
  keepExploring: 'Keep exploring',
  tabs: { inicio: 'Home', pagos: 'Payments', reclamos: 'Complaints', reservas: 'Bookings', mas: 'More' }
};

export const DEMO_TX: Dict<DemoTx> = { es: ES, pt: PT, en: EN };
