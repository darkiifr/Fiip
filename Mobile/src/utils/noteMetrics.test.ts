import { getNoteMetrics, stripNoteMarkup } from './noteMetrics';

describe('noteMetrics', () => {
  it('extracts readable text without script or style content', () => {
    const content = '<p title="1 > 0">Texte &amp; suite</p><script>alert("secret")</script><style>body{display:none}</style>';

    expect(stripNoteMarkup(content)).toBe('Texte & suite');
    expect(getNoteMetrics(content)).toMatchObject({
      plainText: 'Texte & suite',
      wordCount: 2,
      readingTimeMinutes: 1,
    });
  });

  it('handles unfinished markup without exposing blocked content', () => {
    expect(stripNoteMarkup('<p>Visible</p><script>secret')).toBe('Visible');
  });
});
