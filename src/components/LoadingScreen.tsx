export function LoadingScreen() {
  return (
    <div className="loading">
      <div className="loading-inner">
        <h1 className="loading-title">할 일</h1>
        <div className="loading-dots" aria-label="불러오는 중">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
