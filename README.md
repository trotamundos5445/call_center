# Call Center de Salud · Atención Trazable

Demo local del flujo SOME: recepción, validación declarada por protocolo, gestión, notificación simulada y registro de actividad.

## Ejecutar

Requiere Node.js. Desde esta carpeta:

```powershell
npm install
npm run dev
```

Vite muestra la dirección local para abrir en el navegador. No requiere cuenta, Azure ni `.env.local`.

## Qué permite probar

- Registrar, editar, buscar y cerrar interacciones ficticias.
- Dejar interacciones pendientes o derivadas con fecha de seguimiento.
- Impedir el cierre si la identidad no está marcada como validada según protocolo o si el resultado sigue pendiente.
- Guardar solicitudes de hora como pendientes de confirmación en AVIS; se detectan duplicados dentro de la demo.
- Marcar una confirmación WhatsApp como simulada solo con consentimiento ficticio. No se envían mensajes.
- Consultar historial, actividad registrada e indicadores calculados desde los datos ficticios del navegador.

## Límites importantes

- La información queda en `localStorage` de este navegador y es solo para demostración. No ingreses datos reales, RUT, teléfonos reales ni información clínica.
- El selector de validación solo registra una decisión manual de la operadora; no verifica identidad.
- AVIS, telefonía y WhatsApp no están conectados. Una solicitud de hora no equivale a una reserva.
- Los indicadores son descriptivos de los datos de muestra; no son metas ni resultados del proyecto. El ausentismo y los beneficios deben validarse con línea base y piloto.
- Para un piloto institucional se requieren autenticación, permisos, auditoría protegida, retención/eliminación, respaldos, revisión de seguridad y las APIs aprobadas por la organización. Esta demo no está diseñada para producción.