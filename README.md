# n8n-nodes-ender-pterodactyl

Custom n8n nodes for interacting with Pterodactyl panels via API and WebSockets.

Este repositorio es **un fork modificado para uso personal/interno**, no pensado para distribución pública ni soporte a terceros.

---

## Instalación

```bash
npm install n8n-nodes-ender-pterodactyl
```

O usando n8n Community Nodes:

1. Ve a **Settings** → **Community Nodes**
2. Selecciona **Install**
3. Ingresa `n8n-nodes-ender-pterodactyl`
4. Acepta los riesgos y selecciona **Install**

---

## Nodos disponibles

Este paquete proporciona los siguientes nodos para n8n:

- **Ender Pterodactyl Client** - Operaciones a nivel de usuario (gestión de servidores, backups, archivos, etc.)
- **Ender Pterodactyl Application** - Operaciones administrativas (gestión de usuarios, ubicaciones, nodos, etc.)
- **Ender Pterodactyl WebSocket** - Comandos en tiempo real vía WebSocket
- **Ender Pterodactyl WebSocket Trigger** - Trigger para eventos del servidor en tiempo real

---

## Origen del proyecto

Este proyecto se basa en el trabajo original:

- **Proyecto original:** `n8n-nodes-pterodactyl`
- **Repositorio:** https://github.com/goevexx/pterodactyl-api-node
- **Autor original:** Nicolas Morawietz
- **Licencia:** MIT

El código original se utiliza y modifica de acuerdo con los términos de la licencia MIT.

### Diferencias con el paquete original

Los nodos en este fork usan el prefijo "Ender" en sus nombres internos para evitar conflictos con el paquete original si ambos están instalados.

---

## Uso previsto

- Uso personal / interno
- Integración específica con instancias propias de n8n
- No se garantiza compatibilidad, estabilidad ni soporte

---

## Licencia

Este proyecto se distribuye bajo la licencia **MIT**.
Ver el archivo [LICENSE](LICENSE) para más detalles.
