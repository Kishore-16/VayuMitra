import L from "leaflet";

/**
 * Custom Canvas-based Wind Particle Flow Animation Layer for Leaflet
 * Inspired by windy.com particle animations.
 */
export class CanvasWindLayer extends L.Layer {
  private _canvas?: HTMLCanvasElement;
  private _ctx?: CanvasRenderingContext2D;
  private _windGrid: any[] = [];
  private _particles: any[] = [];
  private _animationFrameId?: number;
  private _resolution = 0.5;

  private _fadeOpacity = 0.92;
  private _particleMultiplier = 0.005;
  private _maxAge = 100;
  private _colorScale = ["#4ade80", "#38bdf8", "#818cf8", "#c084fc", "#f472b6"];

  constructor(options?: any) {
    super();
    L.setOptions(this, options);
  }

  setData(windData: any) {
    if (windData && windData.grid) {
      this._windGrid = windData.grid;
      if (windData.grid_meta) {
        this._resolution = windData.grid_meta.resolution_deg;
      }
      this._resetParticles();
    }
  }

  onAdd(map: L.Map) {
    this._map = map;
    this._canvas = L.DomUtil.create("canvas", "leaflet-wind-canvas-layer") as HTMLCanvasElement;
    this._canvas.style.position = "absolute";
    this._canvas.style.top = "0";
    this._canvas.style.left = "0";
    this._canvas.style.pointerEvents = "none";
    this._canvas.style.zIndex = "350"; // Above base maps, below popups
    
    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;
    this._ctx = this._canvas.getContext("2d")!;

    map.getPanes().overlayPane.appendChild(this._canvas);

    map.on("move", this._onMove, this);
    map.on("resize", this._onResize, this);

    this._onMove();
    this._resetParticles();
    this._animate();

    return this;
  }

  onRemove(map: L.Map) {
    if (this._animationFrameId) cancelAnimationFrame(this._animationFrameId);
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    map.off("move", this._onMove, this);
    map.off("resize", this._onResize, this);
    return this;
  }

  private _onMove() {
    if (!this._map || !this._canvas) return;
    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);
    this._resetParticles(); // Reset particles on pan/zoom so they don't draw incorrectly
  }

  private _onResize() {
    if (!this._map || !this._canvas) return;
    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;
    this._resetParticles();
  }

  private _getInterpolatedWind(lat: number, lon: number) {
    if (!this._windGrid.length) return null;
    
    // Very simple nearest neighbor for performance (bilinear is better but this works for demo)
    let nearest = this._windGrid[0];
    let minDist = 999;
    
    for (const point of this._windGrid) {
      const dist = Math.pow(point.lat - lat, 2) + Math.pow(point.lon - lon, 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }
    
    if (minDist > this._resolution * 2) return null; // Too far from grid
    return nearest;
  }

  private _resetParticles() {
    if (!this._map || !this._canvas) return;
    this._particles = [];
    const numParticles = Math.floor(this._canvas.width * this._canvas.height * this._particleMultiplier);
    
    const bounds = this._map.getBounds();
    
    for (let i = 0; i < numParticles; i++) {
      this._particles.push(this._createParticle(bounds));
    }
  }

  private _createParticle(bounds: L.LatLngBounds) {
    return {
      lat: bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth()),
      lon: bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest()),
      age: Math.floor(Math.random() * this._maxAge),
      color: this._colorScale[Math.floor(Math.random() * this._colorScale.length)]
    };
  }

  private _animate() {
    if (!this._map || !this._canvas || !this._ctx) return;
    
    // Fade existing trails
    this._ctx.fillStyle = `rgba(8, 13, 26, ${1 - this._fadeOpacity})`;
    const prev = this._ctx.globalCompositeOperation;
    this._ctx.globalCompositeOperation = "destination-in";
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.globalCompositeOperation = prev;

    const bounds = this._map.getBounds();
    this._ctx.lineWidth = 1.2;

    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      
      if (p.age > this._maxAge) {
        this._particles[i] = this._createParticle(bounds);
        continue;
      }

      const wind = this._getInterpolatedWind(p.lat, p.lon);
      if (!wind) {
        p.age = this._maxAge + 1;
        continue;
      }

      // Convert wind u/v (m/s roughly) to lat/lon change per frame
      // scale factor based on zoom
      const zoomScale = Math.pow(2, this._map.getZoom() - 10); 
      const dt = 0.0003 / zoomScale; 
      
      const nextLat = p.lat + (wind.v * dt);
      const nextLon = p.lon + (wind.u * dt); // u is East-West, v is North-South

      const startPos = this._map.latLngToContainerPoint([p.lat, p.lon]);
      const endPos = this._map.latLngToContainerPoint([nextLat, nextLon]);

      this._ctx.beginPath();
      this._ctx.strokeStyle = p.color;
      this._ctx.moveTo(startPos.x, startPos.y);
      this._ctx.lineTo(endPos.x, endPos.y);
      this._ctx.stroke();

      p.lat = nextLat;
      p.lon = nextLon;
      p.age++;
    }

    this._animationFrameId = requestAnimationFrame(() => this._animate());
  }
}
