// [PAGE MARKER] W4: 리더보드 페이지 구현 추가
// W4는 Supabase get_weekly_top10() RPC를 이 페이지에 연결할 것

export default function Leaderboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">사내 리더보드</h1>
      <p className="text-muted-foreground">
        리더보드 데이터를 불러오려면 Slack 로그인이 필요합니다.
      </p>
      {/* [W4 SLOT] 주간 TOP 10 그리드 */}
      {/* [W4 SLOT] 본인 순위 하이라이트 */}
    </div>
  );
}
