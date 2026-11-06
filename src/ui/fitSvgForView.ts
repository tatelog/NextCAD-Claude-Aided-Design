// ビューアの中で図を枠の幅に合わせて縮めて見せる（統括の依頼 2026-11-06。ビューアの直し A）。根の要素の幅を 100%、高さを自動にする。
// 幅と高さは style で指定する（SVG の属性 height="auto" は無効なので使わない）。zip に入れる SVG は実寸のまま（この関数は表示にだけ使う）。
export function fitSvgForView(svg: string): string {
  return svg.replace(/^<svg([^>]*)>/, (_m, attrs: string) => {
    const kept = attrs.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '').replace(/\sstyle="[^"]*"/, '')
    return `<svg${kept} style="width:100%;height:auto">`
  })
}
