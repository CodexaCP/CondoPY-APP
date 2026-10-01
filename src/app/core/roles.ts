// Roles del sistema y a qué sección de la app entra cada uno.
// Hoy solo el Encargado de edificio (BuildingManager) tiene su propia sección (/manager); Operador y
// Administrador de empresa se podrían sumar agregándolos acá, sin tocar el resto.
export const MANAGER_ROLES: readonly string[] = ['BuildingManager'];

export function isManagerRole(role: string | null | undefined): boolean {
  return !!role && MANAGER_ROLES.includes(role);
}

// Mismos nombres que el panel web.
export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'SuperAdmin':       return 'Superadministrador';
    case 'CompanyAdmin':     return 'Administrador de empresa';
    case 'CompanyOperator':  return 'Operador de empresa';
    case 'BuildingManager':  return 'Encargado de edificio';
    case 'Resident':         return 'Residente';
    case 'Porter':           return 'Portería';
    case 'Owner':            return 'Propietario';
    default:                 return role ?? '';
  }
}

// Pantalla de inicio según el rol.
export function homeRouteFor(role: string | null | undefined): string {
  return isManagerRole(role) ? '/manager' : '/area';
}
