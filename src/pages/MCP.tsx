// [PAGE MARKER] W3: MCP·플러그인 분석 페이지 구현 추가
// W3는 get_top_mcp / get_top_plugins Tauri 커맨드 결과를 이 페이지에 연결할 것

export default function MCP() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">MCP · 플러그인 분석</h1>
      <p className="text-muted-foreground">
        MCP 서버 및 플러그인 사용 데이터를 수집 중입니다.
      </p>
      {/* [W3 SLOT] 개인 MCP TOP 10 */}
      {/* [W3 SLOT] 개인 플러그인 목록 */}
      {/* [W3 SLOT] 사내 인기 MCP (W4 Supabase 집계 연동) */}
    </div>
  );
}
