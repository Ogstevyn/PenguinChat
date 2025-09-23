import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Smartphone, Users, Mail, MapPin, Wifi } from 'lucide-react';

const AnimatedWatermarks: React.FC = () => {
  const watermarkElements = [
    {
      icon: MessageCircle,
      position: { x: '10%', y: '20%' },
      size: 60,
      delay: 0,
      duration: 8,
    },
    {
      icon: Smartphone,
      position: { x: '85%', y: '15%' },
      size: 50,
      delay: 1,
      duration: 6,
    },
    {
      icon: Users,
      position: { x: '15%', y: '70%' },
      size: 55,
      delay: 2,
      duration: 10,
    },
    {
      icon: Mail,
      position: { x: '80%', y: '65%' },
      size: 45,
      delay: 0.5,
      duration: 7,
    },
    {
      icon: MapPin,
      position: { x: '90%', y: '45%' },
      size: 40,
      delay: 1.5,
      duration: 9,
    },
    {
      icon: Wifi,
      position: { x: '5%', y: '45%' },
      size: 35,
      delay: 2.5,
      duration: 5,
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large HOMING text watermark */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8, rotateX: 45 }}
        animate={{ 
          opacity: 0.03, 
          scale: 1, 
          rotateX: 0,
          rotateY: [0, 5, 0],
        }}
        transition={{ 
          duration: 2,
          rotateY: {
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
      >
        <h1 
          className="text-9xl font-serif font-bold text-primary select-none"
          style={{
            fontSize: 'clamp(8rem, 20vw, 16rem)',
            transform: 'perspective(1000px) rotateX(20deg)',
            textShadow: '0 20px 40px rgba(30, 58, 138, 0.1)',
          }}
        >
          HOMING
        </h1>
      </motion.div>

      {/* Floating icon watermarks */}
      {watermarkElements.map((element, index) => (
        <motion.div
          key={index}
          className="absolute opacity-10"
          style={{
            left: element.position.x,
            top: element.position.y,
          }}
          initial={{ 
            opacity: 0, 
            scale: 0,
            rotateZ: -180,
            z: -100,
          }}
          animate={{ 
            opacity: [0.05, 0.15, 0.05],
            scale: [0.8, 1.2, 0.8],
            rotateZ: [0, 360],
            z: [0, 50, 0],
            y: [-20, 20, -20],
            x: [-10, 10, -10],
          }}
          transition={{
            duration: element.duration,
            delay: element.delay,
            repeat: Infinity,
            ease: "easeInOut",
            rotateZ: {
              duration: element.duration * 2,
              ease: "linear",
              repeat: Infinity,
            }
          }}
        >
          <element.icon 
            size={element.size} 
            className="text-primary filter blur-[0.5px]"
            style={{
              filter: 'drop-shadow(0 10px 20px rgba(30, 58, 138, 0.1))',
              transform: 'perspective(500px) rotateX(20deg)',
            }}
          />
        </motion.div>
      ))}

      {/* Animated geometric shapes */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`geo-${i}`}
          className="absolute w-2 h-2 bg-accent/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.2, 0.6, 0.2],
            rotate: [0, 180, 360],
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        />
      ))}

      {/* Gradient orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-radial from-accent/15 to-transparent rounded-full blur-3xl"
        animate={{
          scale: [1.2, 0.8, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Floating connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-5">
        <motion.path
          d="M 100 200 Q 300 100 500 300 T 800 250"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-primary"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.1 }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M 200 400 Q 400 200 600 450 T 900 350"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          className="text-accent"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.1 }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </svg>
    </div>
  );
};

export default AnimatedWatermarks;