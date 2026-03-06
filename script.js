// Three.js Gradient Animation
(function() {
  // TouchTexture class
  class TouchTexture {
    constructor() {
      this.size = 64;
      this.width = this.height = this.size;
      this.maxAge = 64;
      this.radius = 0.25 * this.size;
      this.speed = 1 / this.maxAge;
      this.trail = [];
      this.last = null;
      this.initTexture();
    }

    initTexture() {
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext("2d");
      this.ctx.fillStyle = "black";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.texture = new THREE.Texture(this.canvas);
    }

    update() {
      this.clear();
      let speed = this.speed;
      for (let i = this.trail.length - 1; i >= 0; i--) {
        const point = this.trail[i];
        let f = point.force * speed * (1 - point.age / this.maxAge);
        point.x += point.vx * f;
        point.y += point.vy * f;
        point.age++;
        if (point.age > this.maxAge) {
          this.trail.splice(i, 1);
        } else {
          this.drawPoint(point);
        }
      }
      this.texture.needsUpdate = true;
    }

    clear() {
      this.ctx.fillStyle = "black";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    addTouch(point) {
      let force = 0;
      let vx = 0;
      let vy = 0;
      const last = this.last;
      if (last) {
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        if (dx === 0 && dy === 0) return;
        const dd = dx * dx + dy * dy;
        let d = Math.sqrt(dd);
        vx = dx / d;
        vy = dy / d;
        force = Math.min(dd * 20000, 2.0);
      }
      this.last = { x: point.x, y: point.y };
      this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
    }

    drawPoint(point) {
      const pos = {
        x: point.x * this.width,
        y: (1 - point.y) * this.height
      };

      let intensity = 1;
      if (point.age < this.maxAge * 0.3) {
        intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
      } else {
        const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
        intensity = -t * (t - 2);
      }
      intensity *= point.force;

      const radius = this.radius;
      let offset = this.size * 5;
      this.ctx.shadowOffsetX = offset;
      this.ctx.shadowOffsetY = offset;
      this.ctx.shadowBlur = radius * 1;
      this.ctx.shadowColor = `rgba(255,255,255,${0.2 * intensity})`;

      this.ctx.beginPath();
      this.ctx.fillStyle = "rgba(255,255,255,1)";
      this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // GradientBackground class
  class GradientBackground {
    constructor(sceneManager) {
      this.sceneManager = sceneManager;
      this.mesh = null;
      this.uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uColor1: { value: new THREE.Vector3(0.945, 0.353, 0.133) },
        uColor2: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
        uColor3: { value: new THREE.Vector3(0.945, 0.353, 0.133) },
        uColor4: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
        uColor5: { value: new THREE.Vector3(0.945, 0.353, 0.133) },
        uColor6: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
        uSpeed: { value: 1.2 },
        uIntensity: { value: 1.8 },
        uTouchTexture: { value: null },
        uGrainIntensity: { value: 0.08 },
        uDarkNavy: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
        uGradientSize: { value: 0.45 },
        uGradientCount: { value: 12.0 },
        uColor1Weight: { value: 0.5 },
        uColor2Weight: { value: 1.8 }
      };
    }

    init() {
      const viewSize = this.sceneManager.getViewSize();
      const geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);

      const material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vUv = uv;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec2 uResolution;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          uniform vec3 uColor4;
          uniform vec3 uColor5;
          uniform vec3 uColor6;
          uniform float uSpeed;
          uniform float uIntensity;
          uniform sampler2D uTouchTexture;
          uniform float uGrainIntensity;
          uniform vec3 uDarkNavy;
          uniform float uGradientSize;
          uniform float uGradientCount;
          uniform float uColor1Weight;
          uniform float uColor2Weight;
          
          varying vec2 vUv;
          
          float grain(vec2 uv, float time) {
            vec2 grainUv = uv * uResolution * 0.5;
            float grainValue = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
            return grainValue * 2.0 - 1.0;
          }
          
          vec3 getGradientColor(vec2 uv, float time) {
            float gradientRadius = uGradientSize;
            
            vec2 center1 = vec2(0.5 + sin(time * uSpeed * 0.4) * 0.4, 0.5 + cos(time * uSpeed * 0.5) * 0.4);
            vec2 center2 = vec2(0.5 + cos(time * uSpeed * 0.6) * 0.5, 0.5 + sin(time * uSpeed * 0.45) * 0.5);
            vec2 center3 = vec2(0.5 + sin(time * uSpeed * 0.35) * 0.45, 0.5 + cos(time * uSpeed * 0.55) * 0.45);
            vec2 center4 = vec2(0.5 + cos(time * uSpeed * 0.5) * 0.4, 0.5 + sin(time * uSpeed * 0.4) * 0.4);
            vec2 center5 = vec2(0.5 + sin(time * uSpeed * 0.7) * 0.35, 0.5 + cos(time * uSpeed * 0.6) * 0.35);
            vec2 center6 = vec2(0.5 + cos(time * uSpeed * 0.45) * 0.5, 0.5 + sin(time * uSpeed * 0.65) * 0.5);
            
            float dist1 = length(uv - center1);
            float dist2 = length(uv - center2);
            float dist3 = length(uv - center3);
            float dist4 = length(uv - center4);
            float dist5 = length(uv - center5);
            float dist6 = length(uv - center6);
            
            float influence1 = 1.0 - smoothstep(0.0, gradientRadius, dist1);
            float influence2 = 1.0 - smoothstep(0.0, gradientRadius, dist2);
            float influence3 = 1.0 - smoothstep(0.0, gradientRadius, dist3);
            float influence4 = 1.0 - smoothstep(0.0, gradientRadius, dist4);
            float influence5 = 1.0 - smoothstep(0.0, gradientRadius, dist5);
            float influence6 = 1.0 - smoothstep(0.0, gradientRadius, dist6);
            
            vec3 color = vec3(0.0);
            color += uColor1 * influence1 * (0.55 + 0.45 * sin(time * uSpeed)) * uColor1Weight;
            color += uColor2 * influence2 * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uColor2Weight;
            color += uColor3 * influence3 * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * uColor1Weight;
            color += uColor4 * influence4 * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * uColor2Weight;
            color += uColor5 * influence5 * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * uColor1Weight;
            color += uColor6 * influence6 * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * uColor2Weight;
            
            color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
            
            float brightness = length(color);
            float mixFactor = max(brightness * 1.2, 0.15);
            color = mix(uDarkNavy, color, mixFactor);
            
            return color;
          }
          
          void main() {
            vec2 uv = vUv;
            
            vec4 touchTex = texture2D(uTouchTexture, uv);
            float vx = -(touchTex.r * 2.0 - 1.0);
            float vy = -(touchTex.g * 2.0 - 1.0);
            float intensity = touchTex.b;
            
            uv.x += vx * 0.8 * intensity;
            uv.y += vy * 0.8 * intensity;
            
            vec3 color = getGradientColor(uv, uTime);
            
            float grainValue = grain(uv, uTime);
            color += grainValue * uGrainIntensity;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      });

      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.position.z = 0;
      this.sceneManager.scene.add(this.mesh);
    }

    update(delta) {
      if (this.uniforms.uTime) {
        this.uniforms.uTime.value += delta;
      }
    }

    onResize(width, height) {
      const viewSize = this.sceneManager.getViewSize();
      if (this.mesh) {
        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
      }
      if (this.uniforms.uResolution) {
        this.uniforms.uResolution.value.set(width, height);
      }
    }
  }

  // App class
  class App {
    constructor() {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      document.body.appendChild(this.renderer.domElement);
      this.renderer.domElement.id = "webGLApp";
      this.renderer.domElement.style.position = "fixed";
      this.renderer.domElement.style.top = "0";
      this.renderer.domElement.style.left = "0";
      this.renderer.domElement.style.zIndex = "1";
      this.renderer.domElement.style.pointerEvents = "none";

      this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
      this.camera.position.z = 50;
      this.scene = new THREE.Scene();
      this.clock = new THREE.Clock();

      this.touchTexture = new TouchTexture();
      this.gradientBackground = new GradientBackground(this);
      this.gradientBackground.uniforms.uTouchTexture.value = this.touchTexture.texture;

      this.init();
    }

    init() {
      this.gradientBackground.init();

      this.tick();

      window.addEventListener("resize", () => this.onResize());
      window.addEventListener("mousemove", (ev) => this.onMouseMove(ev));
      window.addEventListener("touchmove", (ev) => this.onTouchMove(ev));
    }

    onTouchMove(ev) {
      ev.preventDefault();
      const touch = ev.touches[0];
      if (touch) {
        this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
      }
    }

    onMouseMove(ev) {
      this.mouse = {
        x: ev.clientX / window.innerWidth,
        y: 1 - ev.clientY / window.innerHeight
      };
      this.touchTexture.addTouch(this.mouse);
    }

    getViewSize() {
      const fovInRadians = (this.camera.fov * Math.PI) / 180;
      const height = Math.abs(this.camera.position.z * Math.tan(fovInRadians / 2) * 2);
      return { width: height * this.camera.aspect, height };
    }

    update(delta) {
      this.touchTexture.update();
      this.gradientBackground.update(delta);
    }

    render() {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      this.renderer.render(this.scene, this.camera);
      this.update(delta);
    }

    tick() {
      this.render();
      requestAnimationFrame(() => this.tick());
    }

    onResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.gradientBackground.onResize(window.innerWidth, window.innerHeight);
    }
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new App();
    });
  } else {
    new App();
  }
})();

// Скролл по клику на стрелку
document.querySelector('.scroll-arrow')?.addEventListener('click', () => {
    window.scrollTo({
        top: window.innerHeight,
        behavior: 'smooth'
    });
});

// Motion Blur Cursor - с адаптивным цветом (ИСПРАВЛЕННЫЙ)
(function() {
  class MotionBlur {
    constructor() {
      this.cursor = document.querySelector(".curzr-motion")
      this.circle = document.querySelector(".cursor-circle")
      this.filter = document.querySelector(".curzr-motion .curzr-motion-blur")

      this.position = {
        distanceX: 0, 
        distanceY: 0,
        pointerX: 0,
        pointerY: 0,
      }
      this.previousPointerX = 0
      this.previousPointerY = 0
      this.angle = 0
      this.previousAngle = 0
      this.degrees = 57.296
      this.moving = false

      this.cursor.removeAttribute('hidden')
    }

    move(event) {
      this.previousPointerX = this.position.pointerX
      this.previousPointerY = this.position.pointerY
      this.position.pointerX = event.clientX
      this.position.pointerY = event.clientY
      this.position.distanceX = Math.min(Math.max(this.previousPointerX - this.position.pointerX, -20), 20)
      this.position.distanceY = Math.min(Math.max(this.previousPointerY - this.position.pointerY, -20), 20)

      // Двигаем курсор с правильным центрированием
      this.cursor.style.transform = `translate(calc(${this.position.pointerX}px - 50%), calc(${this.position.pointerY}px - 50%))`
      
      // Получаем hero блок
      const hero = document.querySelector('.hero')
      if (hero) {
        const heroRect = hero.getBoundingClientRect()
        
        // Проверяем, находится ли курсор ВНУТРИ hero
        const isInsideHero = (
          event.clientX >= heroRect.left &&
          event.clientX <= heroRect.right &&
          event.clientY >= heroRect.top &&
          event.clientY <= heroRect.bottom
        )
        
        // Меняем цвет
        if (isInsideHero) {
          this.circle.setAttribute('fill', '#FFFFFF') // Белый в hero
        } else {
          this.circle.setAttribute('fill', '#000000') // Чёрный в остальном
        }
      }
      
      this.rotate(this.position)
      this.moving ? this.stop() : this.moving = true
    }

    rotate(position) {
      let unsortedAngle = Math.atan(Math.abs(position.distanceY) / Math.abs(position.distanceX)) * this.degrees
      
      if (isNaN(unsortedAngle)) {
        this.angle = this.previousAngle
      } else {
        if (unsortedAngle <= 45) {
          if (position.distanceX * position.distanceY >= 0) {
            this.angle = +unsortedAngle
          } else {
            this.angle = -unsortedAngle
          }
          this.filter?.setAttribute('stdDeviation', `${Math.abs(this.position.distanceX / 2)}, 0`)
        } else {
          if (position.distanceX * position.distanceY <= 0) {
            this.angle = 180 - unsortedAngle
          } else {
            this.angle = unsortedAngle
          }
          this.filter?.setAttribute('stdDeviation', `${Math.abs(this.position.distanceY / 2)}, 0`)
        }
      }
      this.cursor.style.transform += ` rotate(${this.angle}deg)`
      this.previousAngle = this.angle
    }

    stop() {
      setTimeout(() => {
        this.filter?.setAttribute('stdDeviation', '0, 0')
        this.moving = false
      }, 50)
    }
  }

  const cursor = new MotionBlur()
  document.addEventListener('mousemove', (e) => cursor.move(e))
})();

