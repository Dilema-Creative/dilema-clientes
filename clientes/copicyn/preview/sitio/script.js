document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('.service-grid');
    if (!carousel) return;

    // Duplicate cards for infinite effect
    carousel.innerHTML += carousel.innerHTML;

    let isPaused = false;
    let scroll = 0;
    const speed = 1; // pixels per frame

    function animateCarousel() {
        if (!isPaused) {
            scroll += speed;
            // Reset scroll for infinite loop
            if (scroll >= carousel.scrollWidth / 2) {
                scroll = 0;
            }
            carousel.style.transform = `translateX(-${scroll}px)`;
        }
        requestAnimationFrame(animateCarousel);
    }

    // Pause on hover
    carousel.addEventListener('mouseenter', () => { isPaused = true; });
    carousel.addEventListener('mouseleave', () => { isPaused = false; });

    animateCarousel();


    

  // About section switching with auto-advance
  const aboutData = [
    {
      title: "Sobre nosotros",
      text: "Con mas de 30 años de experiencia en el rubro, somos una empresa dedicada a ofrecer soluciones gráficas integrales para empresas y particulares.",
      background: "images/about-bg1.jpg"
    },
    {
      title: "Calidad y compromiso", 
      text: "Brindamos un servicio de alta calidad, con un enfoque en la satisfacción del cliente y materiales de primera línea para todos nuestros proyectos.",
      background: "images/about-bg2.jpg"
    },
    {
      title: "Por qué elegirnos",
      text: "Ofrecemos atención personalizada, tecnología de punta y un equipo profesional dedicado a lograr los mejores resultados para tu negocio o proyecto.",
      background: "images/about-bg3.jpg"
    }
  ];

  let aboutIndex = 0;
  let aboutAutoTimer;
  const aboutTitle = document.getElementById('about-title');
  const aboutText = document.getElementById('about-text');

  function updateAbout() {
    aboutTitle.textContent = aboutData[aboutIndex].title;
    aboutText.textContent = aboutData[aboutIndex].text;
    document.getElementById('about').style.backgroundImage = 
      `url('${aboutData[aboutIndex].background}')`;
    
    // Update indicators
    document.querySelectorAll('.about-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === aboutIndex);
    });
    
    // Reset auto-advance timer
    clearTimeout(aboutAutoTimer);
    aboutAutoTimer = setTimeout(() => {
      aboutIndex = (aboutIndex + 1) % aboutData.length;
      updateAbout();
    }, 5000);
  }

  // Add click handlers for dots
  document.querySelectorAll('.about-dot').forEach((dot, index) => {
    dot.addEventListener('click', () => {
      aboutIndex = index;
      updateAbout();
    });
  });

  // Preload about section background images
  aboutData.forEach(item => {
    const img = new Image();
    img.src = item.background;
  });

  updateAbout();

    // Hero video switching with smooth transitions
    const heroVideos = [
        'videos/hero-video1.mp4',
        'videos/hero-video2.mp4',
        'videos/hero-video3.mp4'
    ];
    let heroIndex = 0;
    let heroAutoTimer;
    let isTransitioning = false;
    const heroVideo = document.getElementById('hero-video');

    // Create a second video element for smooth transitions
    let heroVideoNext = null;
    if (heroVideo) {
        heroVideoNext = heroVideo.cloneNode(true);
        heroVideoNext.id = 'hero-video-next';
        heroVideoNext.style.opacity = '0';
        heroVideoNext.style.transition = '';
        heroVideoNext.muted = true;
        heroVideoNext.autoplay = false;
        heroVideo.parentNode.insertBefore(heroVideoNext, heroVideo.nextSibling);
    }

    function preloadVideo(videoElement, src) {
        return new Promise((resolve, reject) => {
            videoElement.src = src;
            videoElement.load();

            const onCanPlay = () => {
                videoElement.removeEventListener('canplay', onCanPlay);
                videoElement.removeEventListener('error', onError);
                resolve();
            };

            const onError = () => {
                videoElement.removeEventListener('canplay', onCanPlay);
                videoElement.removeEventListener('error', onError);
                reject();
            };

            videoElement.addEventListener('canplay', onCanPlay);
            videoElement.addEventListener('error', onError);
        });
    }

    async function updateHeroVideo() {
        if (isTransitioning || !heroVideo || !heroVideoNext) return;

        isTransitioning = true;

        try {
            // Preload the next video
            await preloadVideo(heroVideoNext, heroVideos[heroIndex]);

            // Start playing the next video
            heroVideoNext.currentTime = 0;
            await heroVideoNext.play();

            // Crossfade transition - fade in the next video while keeping current video visible
            heroVideoNext.style.transition = 'opacity 1s ease-in-out';
            heroVideo.style.transition = 'opacity 1s ease-in-out';

            // Use requestAnimationFrame to ensure the transition styles are applied
            requestAnimationFrame(() => {
                heroVideoNext.style.opacity = '1';
                heroVideo.style.opacity = '0';
            });

            // Wait for transition to complete
            setTimeout(() => {
                // Swap the video elements
                heroVideo.src = heroVideoNext.src;
                heroVideo.style.opacity = '1';
                heroVideo.currentTime = heroVideoNext.currentTime;
                heroVideo.play();

                heroVideoNext.pause();
                heroVideoNext.style.opacity = '0';

                // Remove transitions for next time
                heroVideo.style.transition = '';
                heroVideoNext.style.transition = '';

                isTransitioning = false;
            }, 1000);

        } catch (error) {
            console.warn('Error loading video:', error);
            // Fallback to immediate switch
            heroVideo.src = heroVideos[heroIndex];
            heroVideo.load();
            heroVideo.play();
            isTransitioning = false;
        }

        // Update indicators
        document.querySelectorAll('.hero-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === heroIndex);
        });

        // Reset auto-advance timer
        clearTimeout(heroAutoTimer);
        heroAutoTimer = setTimeout(() => {
            heroIndex = (heroIndex + 1) % heroVideos.length;
            updateHeroVideo();
        }, 8000);
    }

    if (heroVideo) {
        // Add click handlers for dots
        document.querySelectorAll('.hero-dot').forEach((dot, index) => {
            dot.addEventListener('click', () => {
                if (!isTransitioning) {
                    heroIndex = index;
                    updateHeroVideo();
                }
            });
        });

        // Start with the first video
        heroVideo.src = heroVideos[0];
        heroVideo.load();
        heroVideo.play();

        // Update indicators for initial state
        document.querySelectorAll('.hero-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === 0);
        });

        // Start auto-advance after initial video loads
        heroVideo.addEventListener('canplay', () => {
            clearTimeout(heroAutoTimer);
            heroAutoTimer = setTimeout(() => {
                heroIndex = (heroIndex + 1) % heroVideos.length;
                updateHeroVideo();
            }, 8000);
        }, { once: true });
    }

    updateAbout();
});

window.addEventListener('scroll', function() {
  const header = document.querySelector('header');
  if (window.scrollY > 10) {
    header.classList.add('opaque');
  } else {
    header.classList.remove('opaque');
  }
});

function handleFadeInOnScroll() {
  const elements = document.querySelectorAll('.fade-in-on-scroll');
  const triggerBottom = window.innerHeight * 0.95;
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < triggerBottom) {
      el.classList.add('in-view');
    }
  });
}
window.addEventListener('scroll', handleFadeInOnScroll);
window.addEventListener('DOMContentLoaded', handleFadeInOnScroll);

function scrollToIntroduction() {
    const introSection = document.querySelector('.introduction-graphic');
    if (introSection) {
        introSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Services carousel functionality with smooth rotation + button control
document.addEventListener('DOMContentLoaded', () => {
    const servicesGrid = document.querySelector('.services-grid');
    const servicesDots = document.querySelectorAll('.services-dot');

    if (servicesGrid && servicesDots.length > 0) {
        // Duplicate cards for infinite effect
        const originalCards = servicesGrid.innerHTML;
        servicesGrid.innerHTML += originalCards;

        // Smooth rotation variables
        let isPaused = false;
        let scroll = 0;
        const speed = 2; // pixels per frame (slower than index.html)

        // Button control variables
        let currentServiceIndex = 0;
        let buttonControlActive = false;
        const totalCards = servicesDots.length;

        // Smooth rotation function (like index.html)
        function animateServicesCarousel() {
            if (!isPaused && !buttonControlActive) {
                scroll += speed;
                // Reset scroll for infinite loop
                if (scroll >= servicesGrid.scrollWidth / 2) {
                    scroll = 0;
                }
                servicesGrid.style.transform = `translateX(-${scroll}px)`;

                // Update dot indicators based on scroll position
                const serviceWidth = 400 + 32; // item width + gap
                const currentIndex = Math.floor(scroll / serviceWidth) % totalCards;
                servicesDots.forEach((dot, index) => {
                    dot.classList.toggle('active', index === currentIndex);
                });
            }
            requestAnimationFrame(animateServicesCarousel);
        }

        // Button control function
        function updateServicesCarousel() {
            buttonControlActive = true;
            const serviceWidth = 400 + 32; // item width + gap (2rem = 32px)
            const offset = currentServiceIndex * serviceWidth;
            scroll = offset; // Sync with smooth rotation
            servicesGrid.style.transform = `translateX(-${offset}px)`;

            // Update indicators
            servicesDots.forEach((dot, index) => {
                dot.classList.toggle('active', index === (currentServiceIndex % totalCards));
            });

            // Reset for infinite loop
            if (currentServiceIndex >= totalCards) {
                setTimeout(() => {
                    servicesGrid.style.transition = 'none';
                    currentServiceIndex = 0;
                    scroll = 0;
                    servicesGrid.style.transform = `translateX(0px)`;
                    setTimeout(() => {
                        servicesGrid.style.transition = 'transform 0.5s ease';
                        buttonControlActive = false; // Resume smooth rotation
                    }, 50);
                }, 500);
            } else {
                // Resume smooth rotation after a delay
                setTimeout(() => {
                    buttonControlActive = false;
                }, 3000);
            }
        }

        // Add click handlers for dots
        servicesDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentServiceIndex = index;
                updateServicesCarousel();
            });
        });

        // Pause smooth rotation on hover
        servicesGrid.addEventListener('mouseenter', () => {
            isPaused = true;
        });
        servicesGrid.addEventListener('mouseleave', () => {
            isPaused = false;
        });

        // Start smooth rotation
        animateServicesCarousel();
    }
});
