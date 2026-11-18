export const COMMENTS_PRIVATE_MARKER = 'SYNTHETIC_PRIVATE_FEED_NEVER_PRINT';
export const COMMENT_MODES = ['normal', 'empty-feed', 'ui-create-status', 'ui-delete-status', 'missing-row', 'body-timeout',
  'post-delete-status', 'post-delete-ignored', 'comment-network', 'post-create-invalid', 'ui-delete-before-create',
  'ui-delete-status-503', 'ui-delete-status-no-response'] as const;
export type CommentMode = typeof COMMENT_MODES[number];

/** Iba DOM kontrakt helpera, nie kópia aplikácie; živé UI sa overí až v dohodnutom okne. */
export function syntheticCommentsPage(mode: CommentMode): string {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <style>button,textarea{display:block;min-height:44px;margin:5px}textarea{width:280px}[data-testid="feed-list"]{min-height:1px}</style>
  <p>${COMMENTS_PRIVATE_MARKER}</p><div id="feed-root"></div><div id="layers"></div>
  <script>
  const mode=${JSON.stringify(mode)}; let post=null; let comment=null;
  const track = element => element.addEventListener('pointerdown', event => {
    void window.recordCommentPointer(event.isTrusted, event.pointerType);
  });
  const api = (method, path, body) => {
    const csrf=document.cookie.match(/(?:^|;\\s*)csrftoken=([^;]+)/)?.[1]||'';
    return fetch(path,{method,credentials:'include',headers:{'Content-Type':'application/json','X-CSRFToken':decodeURIComponent(csrf)},
      body:body?JSON.stringify(body):undefined});
  };
  const commentsPath = () => '/api/auth/feed/posts/'+post.id+'/comments/';
  function paintRow() {
    const list=document.querySelector('[data-testid="feed-comments-scroll"]'); list.replaceChildren();
    if(!comment||mode==='missing-row')return;
    const row=document.createElement('div');row.setAttribute('data-comment-id',comment.id);
    const text=document.createElement('p');text.textContent=comment.text;row.append(text);
    const remove=document.createElement('button');remove.textContent='Zmazať komentár';remove.setAttribute('aria-label','Zmazať komentár');
    track(remove);remove.onclick=confirmDelete;row.append(remove);list.append(row);
  }
  function confirmDelete() {
    const layer=document.createElement('div');layer.setAttribute('data-testid','feed-comment-delete-confirm');
    const action=document.createElement('button');action.setAttribute('data-testid','feed-comment-delete-confirm-action');
    action.textContent='Vymazať';track(action);
    action.onclick=async()=>{try{const reply=await api('DELETE',commentsPath()+comment.id+'/');
      if(reply.status===204){comment=null;layer.remove();paintRow();}}catch{}};
    layer.append(action);document.getElementById('layers').append(layer);
  }
  function openDetail() {
    const mobile=innerWidth<1024;const detail=document.createElement('div');
    detail.setAttribute('data-testid',mobile?'feed-mobile-detail':'feed-post-overlay');
    const wrap=document.createElement('div');if(!mobile)wrap.setAttribute('data-testid','feed-post-overlay-comments');
    const area=document.createElement('div');area.setAttribute('data-testid','feed-post-comments');
    const list=document.createElement('div');list.setAttribute('data-testid','feed-comments-scroll');area.append(list);
    const input=document.createElement('textarea');input.setAttribute('aria-label','Napíš komentár...');area.append(input);
    const send=document.createElement('button');send.textContent=mode==='ui-delete-before-create'?'Nedostupná akcia':'Pridať';
    send.disabled=true;track(send);
    input.oninput=()=>{send.disabled=!input.value.trim();};
    send.onclick=async()=>{try{const reply=await api('POST',commentsPath(),{text:input.value});
      if(reply.status===201){comment=await reply.json();input.value='';send.disabled=true;paintRow();}}catch{}};
    area.append(send);wrap.append(area);detail.append(wrap);document.getElementById('layers').append(detail);
  }
  void api('GET','/api/auth/feed/posts/').then(reply=>reply.json()).then(data=>{
    post=data.results[0];const feed=document.createElement('div');
    feed.setAttribute('data-testid',mode==='empty-feed'&&!post?'feed-empty-state':'feed-list');
    if(mode==='empty-feed'&&!post)feed.textContent='Prázdna skúšobná Nástenka';
    document.getElementById('feed-root').append(feed);if(!post)return;
    const card=document.createElement('article');card.setAttribute('data-testid','feed-post-card');card.setAttribute('data-post-type','free_post');
    const caption=document.createElement('p');caption.textContent=post.caption;card.append(caption);
    const open=document.createElement('button');open.setAttribute('data-testid','feed-comments-button');open.textContent='Komentáre';
    track(open);open.onclick=openDetail;card.append(open);feed.append(card);
  });
  </script>`;
}
