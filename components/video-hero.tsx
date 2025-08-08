export default function VideoHero() {
  return (
    <section className="relative container flex min-h-[calc(100vh-3.5rem)] max-w-screen-2xl flex-col items-center justify-center space-y-8 py-24 text-center md:py-32 overflow-hidden">
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

      {/* Content */}
      <div className="relative z-10">
        <h1 className="mx-auto max-w-4xl text-center text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
          We design pioneering tools that
          <br className="hidden sm:block" />
          unlock imaging data to improve
          <br className="hidden sm:block" />
          patient outcomes
        </h1>
      </div>
    </section>
  )
}


