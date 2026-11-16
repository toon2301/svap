export const CATEGORY_MODES = [
  'normal-on', 'normal-off', 'master-off', 'bad-payload', 'duplicate', 'change-status',
  'change-network', 'change-proxy', 'change-redirect-temporary', 'change-redirect-permanent',
  'reload-stale', 'body-failure', 'body-timeout',
  'restore-status', 'restore-shape', 'restore-ignored',
] as const;
export type CategoryMode = typeof CATEGORY_MODES[number];
export const CATEGORY_PRIVATE_MARKER = 'SYNTHETIC_PRIVATE_CATEGORY_NEVER_PRINT';

/**
 * Syntetický DOM kontrakt, nie kópia aplikácie: dve rozloženia v DOM,
 * tabindex=-1, pointerdown s preventDefault aj onclick a deduplikácia hodnoty.
 */
export function syntheticCategoryPage(mode: CategoryMode, stale: boolean): string {
  const originalLike = mode !== 'normal-off';
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>.mobile{display:none}button{display:block;width:240px;height:60px;margin:8px}
    @media(max-width:1023px){.desktop{display:none}.mobile{display:block}}</style>
    <h1>Upozornenia</h1><p>${CATEGORY_PRIVATE_MARKER}</p>
    <div class="desktop" data-testid="notifications-category-likes-desktop">
      <button tabindex="-1" data-value="false" disabled>Vypnuté</button>
      <button tabindex="-1" data-value="true" disabled>Zapnuté</button></div>
    <div class="mobile" data-testid="notifications-category-likes-mobile">
      <button tabindex="-1" data-value="false" disabled>Vypnuté</button>
      <button tabindex="-1" data-value="true" disabled>Zapnuté</button></div>
    <script>
    const mode = ${JSON.stringify(mode)};
    let confirmed = null;
    let desired = null;
    const buttons = [...document.querySelectorAll('button')];
    function paint(value) {
      for (const button of buttons) {
        button.querySelector('svg')?.remove();
        if ((button.dataset.value === 'true') === value) {
          const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          check.setAttribute('width','10'); check.setAttribute('height','10'); button.prepend(check);
        }
      }
    }
    async function choose(target) {
      if (desired === target || (desired === null && confirmed === target)) return;
      desired = target;
      paint(target);
      const payload = mode === 'bad-payload' ? {notify_likes:target,push_notifications:true} : {notify_likes:target};
      const token = document.cookie.match(/(?:^|;\\s*)csrftoken=([^;]+)/)?.[1];
      const send = () => fetch('/api/auth/push/preferences/', {method:'PATCH',credentials:'include',
        headers:{'Content-Type':'application/json','X-CSRFToken':decodeURIComponent(token || '')},body:JSON.stringify(payload)});
      try {
        const pending = send();
        if (mode === 'duplicate') void send().catch(() => {});
        const response = await pending;
        if (response.status === 200) { const value = await response.json(); confirmed = value.notify_likes; }
      } catch {} finally { desired = null; paint(confirmed); }
    }
    for (const button of buttons) {
      button.onpointerdown = event => {
        event.preventDefault();
        void window.recordCategoryPointer(event.isTrusted, event.pointerType);
        void choose(button.dataset.value === 'true');
      };
      button.onclick = () => { void choose(button.dataset.value === 'true'); };
    }
    void fetch('/api/auth/push/preferences/', {credentials:'include'}).then(response => response.json()).then(value => {
      confirmed = value.notify_likes;
      paint(${stale ? String(originalLike) : 'confirmed'});
      for (const button of buttons) button.disabled = !value.in_app_notifications;
    });
    </script>`;
}
