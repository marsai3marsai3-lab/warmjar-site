// Server Component — 不含 "use client"
// video_id 在 server-side 渲染，不暴露給未登入用戶

type Props = {
  videoId: string;
  videoProvider: "youtube" | "vimeo";
  title: string;
};

export function VideoPlayer({ videoId, videoProvider, title }: Props) {
  const embedUrl =
    videoProvider === "vimeo"
      ? // Vimeo Pro：dnt=1 不追蹤、byline=0 隱藏作者
        `https://player.vimeo.com/video/${videoId}?dnt=1&byline=0&title=0&portrait=0`
      : // YouTube：nocookie 模式
        `https://www.youtube-nocookie.com/embed/${videoId}` +
        `?rel=0&modestbranding=1&disablekb=1&controls=1&iv_load_policy=3`;

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-ink select-none">
      {/* 透明 overlay 防止右鍵選單，不影響播放控制 */}
      <div
        className="absolute inset-0 z-10"
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      />
      <iframe
        src={embedUrl}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="w-full h-full border-0"
        referrerPolicy="strict-origin"
      />
    </div>
  );
}
