// Keyless schematic for the explicit judge demo only. It uses real role-filtered map data.
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  const svgNode = (name, attrs = {}) => { const n = document.createElementNS(ns, name); for (const [k,v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const centre = { lat: -37.797, lng: 144.9615 };
  const project = p => ({ x: 500 + (p.lng - centre.lng) * 65000, y: 280 - (p.lat - centre.lat) * 82000 });
  class DemoMap {
    constructor(container) {
      this.container = container; container.setAttribute('aria-label', 'Judge demo schematic map, not Google Maps'); container.replaceChildren(); container.classList.add('judge-map');
      this.svg = svgNode('svg', { viewBox: '0 0 1000 560', role: 'img', 'aria-label': 'Schematic University of Melbourne area, not a navigation map', preserveAspectRatio: 'none' });
      this.svg.append(svgNode('rect', { width: 1000, height: 560, fill: '#dce5da' }));
      for (const [x,y,w,h] of [[100,60,200,130],[370,80,250,120],[710,60,160,150],[150,300,170,180],[650,300,220,140]]) this.svg.append(svgNode('rect', { x,y,width:w,height:h,rx:18,fill:'#c3cfc1',stroke:'#aebbac' }));
      for (const d of ['M0 250 H1000','M340 0 V560','M640 0 V560','M0 500 H1000']) this.svg.append(svgNode('path', { d, stroke: '#f8f6ef', 'stroke-width': 22, fill: 'none' }));
      const title = svgNode('text', { x: 20, y: 30, fill: '#34473b', 'font-size': 20 }); title.textContent = 'Campus schematic · fictional placements'; this.svg.append(title);
      container.append(this.svg); this.listeners = {};
      this.svg.addEventListener('click', e => { const r = this.svg.getBoundingClientRect(), x = (e.clientX-r.left)/r.width*1000, y = (e.clientY-r.top)/r.height*560; this.listeners.click?.({ latLng: { lat: () => centre.lat-(y-280)/82000, lng: () => centre.lng+(x-500)/65000 } }); });
    }
    addListener(name, fn) { this.listeners[name] = fn; }
    setCenter() {} // The bounded schematic deliberately has no navigation or zoom.
    setZoom() {}
  }
  class Pin {
    constructor(o) { this.element = document.createElement('span'); this.element.className = 'judge-pin'; this.element.style.backgroundColor = o.background; this.glyphText = o.glyphText; }
    set glyphText(value) { this.element.textContent = value; }
  }
  class Marker {
    constructor(o) {
      this.element = document.createElement(o.gmpClickable ? 'button' : 'span');
      if (o.gmpClickable) this.element.type = 'button';
      this.element.className = 'judge-marker'; this.element.append(o.content instanceof Pin ? o.content.element : o.content); this.title = o.title; this.position = o.position; this.map = o.map;
    }
    set title(value) { this.element.title = value; this.element.setAttribute('aria-label', value); }
    set position(value) { this.point = project(value); this.element.style.left = `${this.point.x/10}%`; this.element.style.top = `${this.point.y/5.6}%`; }
    set map(value) { this.owner = value; if (value) value.container.append(this.element); else this.element.remove(); }
    addEventListener(name, fn) { this.element.addEventListener(name === 'gmp-click' ? 'click' : name, e => { e.stopPropagation(); fn(); }); }
    addListener(name, fn) { this.addEventListener(name, fn); }
  }
  class Info {
    setContent(content) { this.content = content; }
    open({map}) {
      this.close(); this.box = document.createElement('div'); this.box.className = 'judge-map-popup';
      const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close map details'; close.addEventListener('click', () => this.close());
      this.box.append(this.content, close); map.container.append(this.box);
    }
    close() { this.box?.remove(); }
  }
  class Line {
    constructor(o) {
      this.element = svgNode('polyline', { fill:'none', stroke:o.icons[0].icon.fillColor, 'stroke-width':o.icons[0].icon.scale*2, 'stroke-linecap':'round', 'stroke-dasharray':'0 12', 'pointer-events':'none', 'data-demo-progress': o.zIndex === 2 ? 'white' : 'grey' });
      this.setMap(o.map);
    }
    setMap(map) { if (map) map.svg.append(this.element); else this.element.remove(); }
    setPath(points) { this.element.setAttribute('points', points.map(p => { const q = project(p); return `${q.x},${q.y}`; }).join(' ')); }
  }
  window.HiVisDemoMapLibraries = { Map:DemoMap, PinElement:Pin, AdvancedMarkerElement:Marker, InfoWindow:Info };
  // The existing renderer uses this constructor for the same grey/white curves.
  window.google = { maps: { Polyline:Line, SymbolPath:{ CIRCLE:0 } } };
})();
