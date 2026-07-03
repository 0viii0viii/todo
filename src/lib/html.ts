/**
 * 콘텐츠 끝에 남는 빈 문단(<p></p> 또는 <p><br></p>)을 제거한다.
 * TipTap 에디터에서 리스트/문단 뒤에 생기는 빈 줄이 저장·로드로 누적되는 것을 막는다.
 * (중간의 빈 줄은 의도된 간격일 수 있으므로 건드리지 않고 '끝'만 정리.)
 */
export function trimTrailingEmpty(html: string): string {
  if (!html) return '';
  return html.replace(/(?:<p>(?:\s|&nbsp;|<br[^>]*>)*<\/p>\s*)+$/i, '');
}
