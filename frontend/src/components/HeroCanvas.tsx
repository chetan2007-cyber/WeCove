import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const HeroCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Group for geometric construct
    const group = new THREE.Group();
    scene.add(group);

    // 1. Subtle architectural isometric wireframe grid
    const gridGeometry = new THREE.PlaneGeometry(30, 30, 24, 24);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f2430,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.rotation.x = -Math.PI / 2.5;
    gridMesh.position.y = -4;
    group.add(gridMesh);

    // 2. Sophisticated intersecting icosahedron wireframe (representing product structural precision)
    const icoGeometry = new THREE.IcosahedronGeometry(5, 1);
    const icoWireframe = new THREE.WireframeGeometry(icoGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xccff00,
      transparent: true,
      opacity: 0.35,
    });
    const icosahedronLines = new THREE.LineSegments(icoWireframe, lineMaterial);
    icosahedronLines.position.set(4, 1, -2);
    group.add(icosahedronLines);

    // 3. Inner accent structure
    const innerGeometry = new THREE.OctahedronGeometry(2.5, 0);
    const innerWireframe = new THREE.WireframeGeometry(innerGeometry);
    const innerMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
    });
    const innerLines = new THREE.LineSegments(innerWireframe, innerMaterial);
    innerLines.position.set(4, 1, -2);
    group.add(innerLines);

    // Mouse movement interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (event.clientX - windowHalfX) * 0.0003;
      mouseY = (event.clientY - windowHalfY) * 0.0003;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!currentMount) return;
      const width = currentMount.clientWidth;
      const height = currentMount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      if (!prefersReducedMotion) {
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        group.rotation.y += 0.0015;
        group.rotation.x = targetY * 0.8;
        group.rotation.y += targetX * 0.8;

        icosahedronLines.rotation.x += 0.001;
        icosahedronLines.rotation.y += 0.0015;
        innerLines.rotation.x -= 0.002;
        innerLines.rotation.y -= 0.002;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      gridGeometry.dispose();
      gridMaterial.dispose();
      icoGeometry.dispose();
      lineMaterial.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none opacity-60 z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
};
