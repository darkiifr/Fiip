import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const DictationPluginKey = new PluginKey('dictation');

export const DictationExtension = Extension.create({
  name: 'dictation',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: DictationPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, decoSet) {
            const val = tr.getMeta(DictationPluginKey);
            if (val !== undefined) {
              if (val === '') return DecorationSet.empty;
              
              const widget = document.createElement('span');
              widget.className = 'text-gray-400 bg-white/10 rounded px-1.5 py-0.5 animate-pulse ml-1 italic inline-block';
              widget.textContent = val;
              
              const deco = Decoration.widget(tr.selection.from, widget, { side: 1 });
              return DecorationSet.create(tr.doc, [deco]);
            }
            return decoSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
