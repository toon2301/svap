'use client';

import { useEffect, useRef } from 'react';

/**
 * Debugging hook pre sledovanie useEffect volaní
 * Použitie: namiesto useEffect použite useEffectDebugger s rovnakými parametrami
 * 
 * @example
 * useEffectDebugger(() => {
 *   // tvoj kód
 * }, [dependency1, dependency2], 'ComponentName.effectName');
 */
export function useEffectDebugger(
  effect: React.EffectCallback,
  deps: React.DependencyList,
  name: string,
) {
  const countRef = useRef(0);
  const prevDepsRef = useRef<React.DependencyList>(deps);
  
  useEffect(() => {
    countRef.current += 1;
    const count = countRef.current;
    
    // Check which dependencies changed
    const changedDeps = deps.reduce((acc, dep, index) => {
      const prevDep = prevDepsRef.current[index];
      if (dep !== prevDep) {
        acc.push({
          index,
          prev: prevDep,
          current: dep,
        });
      }
      return acc;
    }, [] as Array<{ index: number; prev: any; current: any }>);
    
    prevDepsRef.current = deps;
    
    // Log effect execution
    console.log(`🔵 useEffect [${name}] - Execution #${count}`, {
      changedDeps: changedDeps.length > 0 ? changedDeps : 'none',
      allDeps: deps,
    });
    
    // Track in global stats
    if (typeof window !== 'undefined') {
      if (!(window as any).__USE_EFFECT_DEBUG_STATS__) {
        (window as any).__USE_EFFECT_DEBUG_STATS__ = new Map();
      }
      const stats = (window as any).__USE_EFFECT_DEBUG_STATS__;
      
      if (!stats.has(name)) {
        stats.set(name, {
          count: 0,
          executions: [],
        });
      }
      
      const effectStats = stats.get(name);
      effectStats.count += 1;
      effectStats.executions.push({
        time: Date.now(),
        count: count,
        changedDeps,
      });
      
      // Keep only last 20 executions
      if (effectStats.executions.length > 20) {
        effectStats.executions = effectStats.executions.slice(-20);
      }
    }
    
    // Call the actual effect
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Utility function to print useEffect stats (callable from console)
if (typeof window !== 'undefined') {
  (window as any).__USE_EFFECT_DEBUG__ = {
    print: () => {
      const stats = (window as any).__USE_EFFECT_DEBUG_STATS__;
      if (!stats || stats.size === 0) {
        console.log('ℹ️ No useEffect debug stats found. Make sure you\'re using useEffectDebugger hook.');
        return;
      }
      
      console.group('🔵 useEffect Execution Statistics');
      const now = Date.now();
      
      stats.forEach((effectStats: any, name: string) => {
        const recent = effectStats.executions.filter((e: any) => now - e.time < 10000).length;
        console.group(`📍 ${name}`);
        console.log(`Total executions: ${effectStats.count}`);
        console.log(`Executions in last 10s: ${recent}`);
        if (effectStats.executions.length > 0) {
          const last = effectStats.executions[effectStats.executions.length - 1];
          console.log(`Last execution: ${((now - last.time) / 1000).toFixed(2)}s ago`);
          if (last.changedDeps.length > 0) {
            console.log('Changed dependencies:', last.changedDeps);
          }
        }
        console.groupEnd();
      });
      
      console.groupEnd();
    },
    clear: () => {
      const stats = (window as any).__USE_EFFECT_DEBUG_STATS__;
      if (stats) {
        stats.clear();
      }
      console.log('✅ useEffect debug stats cleared');
    },
  };
  
  console.log('🔵 useEffect Debugger available! Use window.__USE_EFFECT_DEBUG__.print() in console');
}

