export default function VideoHero() {
  return (
    <section className="relative container flex min-h-[calc(100vh-3.5rem)] max-w-screen-2xl flex-col items-center justify-end pb-14 text-center sm:pb-16 md:pb-20 lg:pb-24 overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-90 pointer-events-none select-none"
        >
          <source src="/output2.webm" type="video/webm" />
          <source src="/output2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/20" />
      </div>

      {/* Content pinned near bottom */}
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          <p className="text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
            We design pioneering tools that
          </p>
          <p className="text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
            unlock imaging data to improve
          </p>
          <p className="text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
            patient outcomes
          </p>
        </div>
      </div>
    </section>
  )
}


