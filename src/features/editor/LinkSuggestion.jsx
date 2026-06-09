import { invoke } from '@tauri-apps/api/core';

export default {
  char: '[[',
  allowSpaces: true,
  
  command: ({ editor, range, props }) => {
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        {
          type: 'mention',
          attrs: props,
        },
        {
          type: 'text',
          text: ' ',
        },
      ])
      .run();
  },

  allow: ({ state, range }) => {
    const $from = state.doc.resolve(range.from);
    return !$from.parent.type.spec.code;
  },

  items: async ({ query }) => {
    try {
      const bookList = await invoke('list_books');
      let allDocs = [];

      for (const book of bookList) {
        const docs = await invoke('list_documents', { bookId: book.id });
        for (const d of docs) {
          const cleanTitle = d.title || d.file_path.split('\\').pop().split('/').pop().replace('.md', '');
          let aliases = [];

          try {
            const rawContent = await invoke('load_document', { path: d.file_path });
            const yamlMatch = rawContent.match(/^---([\s\S]*?)---/);
            if (yamlMatch) {
              const yamlText = yamlMatch[1];
              const aliasMatch = yamlText.match(/aliases:\s*\[([\s\S]*?)\]/) || yamlText.match(/aliases:\s*\n\s*-\s*([\s\S]*?)(?=\n\w|$)/);
              if (aliasMatch) {
                aliases = aliasMatch[1].split(',').map(a => a.trim().replace(/['"]/g, ''));
              }
            }
          } catch (e) {}

          allDocs.push({
            id: d.id,
            label: cleanTitle,
            aliases: aliases,
            filePath: d.file_path
          });
        }
      }

      const lowerQuery = query.toLowerCase();
      return allDocs.filter(item => {
        const matchTitle = item.label.toLowerCase().includes(lowerQuery);
        const matchAlias = item.aliases.some(alias => alias.toLowerCase().includes(lowerQuery));
        return matchTitle || matchAlias;
      });
    } catch (err) {
      console.error("Gagal memuat rekomendasi link:", err);
      return [];
    }
  },

  render: () => {
    let component;

    return {
      onStart: (props) => {
        component = document.createElement('div');
        component.className = 'wiki-link-dropdown';
        component.style.backgroundColor = 'var(--panel-bg, #1e1e24)';
        component.style.border = '1px solid var(--rose-200, #8a1240)';
        component.style.borderRadius = '6px';
        component.style.padding = '6px';
        component.style.position = 'fixed';
        component.style.zIndex = '9999';
        component.style.display = 'flex';
        component.style.flexDirection = 'column';
        component.style.gap = '4px';
        component.style.maxHeight = '220px';
        component.style.overflowY = 'auto';
        component.style.boxShadow = '0 4px 15px rgba(138, 18, 64, 0.15)';
        component.style.minWidth = '200px';

        document.body.appendChild(component);
        updateMenu(props);
      },

      onUpdate(props) {
        updateMenu(props);
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          destroy();
          return true;
        }
        return false;
      },

      onExit() {
        destroy();
      },
    };

    function updateMenu(props) {
      if (!component) return;
      component.innerHTML = '';
      
      const { items, command, query } = props;
      
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.style.padding = '8px 12px';
        empty.style.color = 'var(--rose-400)';
        empty.style.fontSize = '11px';
        empty.style.fontStyle = 'italic';
        empty.style.fontFamily = 'var(--font-serif-prose)';
        empty.innerText = 'No chronicle nodes matched...';
        component.appendChild(empty);
      } else {
        items.forEach((item) => {
          const button = document.createElement('button');
          button.style.background = 'none';
          button.style.border = 'none';
          button.style.color = 'var(--rose-800)';
          button.style.textAlign = 'left';
          button.style.padding = '6px 12px';
          button.style.fontSize = '12px';
          button.style.cursor = 'pointer';
          button.style.borderRadius = '4px';
          button.style.fontFamily = 'var(--font-serif-prose)';
          button.style.display = 'flex';
          button.style.flexDirection = 'column';
          
          const titleSpan = document.createElement('span');
          titleSpan.innerText = item.label;
          button.appendChild(titleSpan);

          if (item.aliases.length > 0) {
            const aliasSpan = document.createElement('span');
            aliasSpan.style.fontSize = '9px';
            aliasSpan.style.color = 'var(--rose-400)';
            aliasSpan.innerText = `aka: ${item.aliases.join(', ')}`;
            button.appendChild(aliasSpan);
          }

          button.onmouseover = () => {
            button.style.backgroundColor = 'var(--rose-100)';
            button.style.color = 'var(--rose-900)';
          };
          button.onmouseout = () => {
            button.style.backgroundColor = 'transparent';
            button.style.color = 'var(--rose-800)';
          };
          
          button.onclick = () => {
            // 🌟 LOGIKA UTAMA: Jika teks yang diketik berbeda dengan nama dokumen asli, gunakan format pipa [[Asli|Ketik]]
            // Jika belum mengetik apa pun (query kosong), otomatis gunakan nama asli dokumennya.
            const userTypedText = query.trim() || item.label;
            const finalDisplayLabel = `[[${item.label}|${userTypedText}]]`;

            command({ id: item.id, label: finalDisplayLabel, filePath: item.filePath });
            destroy();
          };
          component.appendChild(button);
        });
      }

      const { clientRect } = props;
      if (clientRect) {
        const rect = clientRect();
        if (rect) {
          component.style.left = `${rect.left}px`;
          component.style.top = `${rect.bottom + 6}px`;
        }
      }
    }

    function destroy() {
      if (component) {
        component.remove();
        component = null;
      }
    }
  },
};