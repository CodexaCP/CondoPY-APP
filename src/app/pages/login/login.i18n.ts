import { Dict } from '../../core/lang.service';

// Textos del ingreso y de «Recuperar contraseña» (pantallas sin sesión) en los tres idiomas.
const ES = {
  login: {
    tagline: 'Portal de propietarios y residentes',
    userLabel: 'Usuario o correo',
    userPlaceholder: 'usuario o email',
    passLabel: 'Contraseña',
    remember: 'Recordarme',
    forgot: '¿Olvidaste tu contraseña?',
    submitting: 'Ingresando...',
    submit: 'Ingresar',
    demoQuestion: '¿Administrás un edificio?',
    demoButton: 'Probá la demo del Encargado',
    demoNote: 'Sin registrarte · datos ficticios · 2 minutos',
    errMultiCompany: 'Usuario con múltiples empresas. Usa usuario@empresa.',
    errWrong: 'Usuario o contraseña incorrectos.',
    errOffline: 'No se pudo conectar. Verifica tu conexión.'
  },
  forgot: {
    title: 'Recuperar contraseña',
    lead: 'Ingresá tu correo o usuario y te mandamos instrucciones para restablecer tu contraseña.',
    label: 'Correo o nombre de usuario',
    placeholder: 'correo@empresa.com',
    sending: 'Enviando...',
    send: 'Enviar instrucciones',
    sent: 'Si el dato ingresado corresponde a una cuenta activa, te llegó un correo con el link para restablecer tu contraseña. Revisá también spam.',
    hint: 'El link se abre en el navegador para completar el cambio.',
    back: 'Volver al inicio de sesión',
    errEmpty: 'Ingresá tu correo o nombre de usuario.'
  }
};

export type LoginTx = typeof ES;

const PT: LoginTx = {
  login: {
    tagline: 'Portal de proprietários e moradores',
    userLabel: 'Usuário ou e-mail',
    userPlaceholder: 'usuário ou e-mail',
    passLabel: 'Senha',
    remember: 'Lembrar de mim',
    forgot: 'Esqueceu a senha?',
    submitting: 'Entrando...',
    submit: 'Entrar',
    demoQuestion: 'Você administra um edifício?',
    demoButton: 'Teste a demo do encarregado',
    demoNote: 'Sem cadastro · dados fictícios · 2 minutos',
    errMultiCompany: 'Usuário com várias empresas. Use usuario@empresa.',
    errWrong: 'Usuário ou senha incorretos.',
    errOffline: 'Não foi possível conectar. Verifique a sua conexão.'
  },
  forgot: {
    title: 'Recuperar senha',
    lead: 'Digite o seu e-mail ou usuário e enviaremos as instruções para redefinir a sua senha.',
    label: 'E-mail ou nome de usuário',
    placeholder: 'email@empresa.com',
    sending: 'Enviando...',
    send: 'Enviar instruções',
    sent: 'Se o dado informado corresponder a uma conta ativa, você recebeu um e-mail com o link para redefinir a senha. Confira também o spam.',
    hint: 'O link abre no navegador para concluir a alteração.',
    back: 'Voltar ao login',
    errEmpty: 'Digite o seu e-mail ou nome de usuário.'
  }
};

const EN: LoginTx = {
  login: {
    tagline: 'Owners and residents portal',
    userLabel: 'Username or email',
    userPlaceholder: 'username or email',
    passLabel: 'Password',
    remember: 'Remember me',
    forgot: 'Forgot your password?',
    submitting: 'Logging in...',
    submit: 'Log in',
    demoQuestion: 'Do you manage a building?',
    demoButton: 'Try the on-site manager demo',
    demoNote: 'No sign-up · fictitious data · 2 minutes',
    errMultiCompany: 'This user belongs to several companies. Use user@company.',
    errWrong: 'Incorrect username or password.',
    errOffline: 'Could not connect. Check your connection.'
  },
  forgot: {
    title: 'Recover password',
    lead: 'Enter your email or username and we will send you instructions to reset your password.',
    label: 'Email or username',
    placeholder: 'email@company.com',
    sending: 'Sending...',
    send: 'Send instructions',
    sent: 'If the information you entered matches an active account, you have received an email with the link to reset your password. Check your spam folder too.',
    hint: 'The link opens in the browser to complete the change.',
    back: 'Back to log in',
    errEmpty: 'Enter your email or username.'
  }
};

export const LOGIN_TX: Dict<LoginTx> = { es: ES, pt: PT, en: EN };
