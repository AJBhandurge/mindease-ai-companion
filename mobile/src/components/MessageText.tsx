import React from 'react';
import { Text, TextStyle } from 'react-native';
import { colors } from '../theme';

// The backend wraps stage directions as `_*sighs softly*_` and coping tips use `**bold**`.
// Render actions as soft italics and bold as bold, instead of showing raw markup.
const TOKEN = /(\*\*[^*]+\*\*|_?\*[^*]+\*_?)/g;

export default function MessageText({ text, style }: { text: string; style: TextStyle | TextStyle[] }) {
  const parts = text.split(TOKEN).filter(Boolean);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <Text key={i} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>;
        }
        const action = part.match(/^_?\*([^*]+)\*_?$/);
        if (action) {
          return <Text key={i} style={{ fontStyle: 'italic', color: colors.textSubtle }}>{action[1]}</Text>;
        }
        return part;
      })}
    </Text>
  );
}
