import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Smartphone, Users, Mail, MapPin, Wifi, Bell, Send, Icon } from 'lucide-react';
import { penguin } from '@lucide/lab';

// Simplified, performance-optimized background with hover-only interactions
const InteractiveBackground: React.FC = () => {
  // Fixed floating icons with CSS-based animations for performance
  const floatingIcons = [
    { Icon: MessageCircle, x: 15, y: 20, size: 32, delay: 0 },
    { Icon: Smartphone, x: 85, y: 15, size: 28, delay: 0.5 },
    { Icon: Users, x: 10, y: 70, size: 35, delay: 1 },
    { Icon: Mail, x: 80, y: 65, size: 30, delay: 1.5 },
    { Icon: MapPin, x: 25, y: 45, size: 26, delay: 2 },
    { Icon: Wifi, x: 75, y: 35, size: 32, delay: 2.5 },
    { Icon: Bell, x: 45, y: 25, size: 28, delay: 3 },
    { Icon: Send, x: 65, y: 75, size: 30, delay: 3.5 },
  ];

  // Three strategic peng watermarks for clean performance
  const pengWatermarks = [
    { 
      id: 1, 
      x: 10, 
      y: 10, 
      direction: 'down-right', 
      speed: 0.8,
      rotation: 15,
      delay: 0 
    },
    { 
      id: 2, 
      x: 80, 
      y: 40, 
      direction: 'up-left', 
      speed: 1.2,
      rotation: -10,
      delay: 2 
    },
    { 
      id: 3, 
      x: 15, 
      y: 75, 
      direction: 'up-right', 
      speed: 0.6,
      rotation: 25,
      delay: 4 
    }
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Floating Interactive Icons - Hover only, no cursor tracking */}
      {floatingIcons.map(({ Icon, x, y, size, delay }, index) => (
        <motion.div
          key={index}
          className="absolute opacity-20 hover:opacity-30 transition-opacity duration-500"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            y: [-10, 10, -10],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 6 + index * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay,
          }}
          whileHover={{
            scale: 1.1,
            rotate: 10,
            transition: { duration: 0.3 }
          }}
        >
          <Icon 
            size={size} 
            className="text-primary filter blur-[0.5px]"
            style={{
              filter: 'drop-shadow(0 5px 15px rgba(26, 26, 26, 0.1))',
              transform: 'perspective(300px) rotateX(15deg)',
            }}
          />
        </motion.div>
      ))}
      
      {/* Three Strategic peng Watermarks */}
      {pengWatermarks.map(({ id, x, y, direction, speed, rotation, delay }) => (
        <motion.div
          key={`peng-${id}`}
          className="absolute text-primary/8 font-serif font-bold select-none pointer-events-none"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            fontSize: '16px',
            transform: `rotate(${rotation}deg)`,
          }}
          animate={{
            opacity: [0.08, 0.12, 0.08],
            scale: [0.98, 1.02, 0.98],
            x: direction.includes('right') ? [0, 20, 0] : [0, -20, 0],
            y: direction.includes('down') ? [0, 15, 0] : [0, -15, 0],
            rotate: [rotation - 5, rotation + 5, rotation - 5],
          }}
          transition={{
            duration: 5 + speed,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay,
          }}
        >
          <div className='flex font-mono gap-1'>
            <span>PENGUIN</span>
            <Icon
              className="text-primary filter blur-[0.5px]"
              iconNode={penguin} />
          </div>
        </motion.div>
      ))}

      {/* Ambient Gradient Orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.05, 0.2],
          x: [-20, 20, -20],
          y: [-10, 10, -10],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-radial from-secondary/8 to-transparent rounded-full blur-3xl"
        animate={{
          scale: [1.2, 0.8, 1.2],
          opacity: [0.15, 0.3, 0.15],
          x: [20, -20, 20],
          y: [10, -10, 10],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />

      {/* Floating Connection Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <motion.path
          d="M 150 250 Q 350 150 550 350 T 850 300"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          className="text-primary"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.1 }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M 250 450 Q 450 250 650 500 T 950 400"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          className="text-secondary"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.08 }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </svg>
    </div>
  );
};

export default InteractiveBackground;