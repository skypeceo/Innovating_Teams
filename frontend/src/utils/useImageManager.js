import { API_URL } from '../config';
import { useState, useEffect, useCallback, useRef } from 'react';

// Cache simple para evitar requests duplicados
const imageCache = new Map();

/**
 * Hook personalizado para gestionar la carga y actualización de imágenes de equipos
 * 
 * @param {number} teamId - ID del equipo
 * @returns {object} Estado y funciones para gestionar imágenes
 */
const useImageManager = (teamId) => {
  const [imageData, setImageData] = useState({
    imageUrl: null,
    hasImage: false,
    loading: true,
    error: null,
    solucionId: null
  });

  const requestInProgressRef = useRef(false);
  const timeoutRef = useRef(null);

  /**
   * Carga la imagen existente del equipo desde la base de datos
   */
  const loadExistingImage = useCallback(async () => {
    if (!teamId) {
      setImageData(prev => ({ ...prev, loading: false }));
      return;
    }

    // Verificar cache primero
    const cacheKey = `team_${teamId}`;
    if (imageCache.has(cacheKey)) {
      const cachedData = imageCache.get(cacheKey);
      setImageData(prev => ({
        ...prev,
        ...cachedData,
        loading: false
      }));
      return;
    }

    // Evitar requests múltiples simultáneos
    if (requestInProgressRef.current) {
      return;
    }

    try {
      requestInProgressRef.current = true;
      setImageData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(
        `${API_URL}/obtener-imagen/?team_id=${teamId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const newImageData = {
        imageUrl: data.image_url,
        hasImage: data.has_image,
        solucionId: data.solucion_id,
        error: null
      };

      if (data.success) {
        // Guardar en cache
        imageCache.set(cacheKey, newImageData);
        
        setImageData(prev => ({
          ...prev,
          ...newImageData,
          loading: false
        }));
      } else {
        // No hay imagen para este equipo, no es un error
        const noImageData = {
          imageUrl: null,
          hasImage: false,
          solucionId: null,
          error: null
        };
        
        imageCache.set(cacheKey, noImageData);
        setImageData(prev => ({
          ...prev,
          ...noImageData,
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error loading existing image:', error);
      setImageData(prev => ({
        ...prev,
        loading: false,
        error: `Error al cargar imagen: ${error.message}`
      }));
    } finally {
      requestInProgressRef.current = false;
    }
  }, [teamId]);

  /**
   * Actualiza los datos de la imagen después de una subida exitosa
   */
  const updateImageData = useCallback((newImageUrl, solucionId = null) => {
    const cacheKey = `team_${teamId}`;
    const newData = {
      imageUrl: newImageUrl,
      hasImage: true,
      solucionId: solucionId,
      error: null
    };
    
    // Actualizar cache
    imageCache.set(cacheKey, newData);
    
    setImageData(prev => ({
      ...prev,
      ...newData
    }));
  }, [teamId]);

  /**
   * Refresca la imagen cargándola nuevamente desde la base de datos
   */
  const refreshImage = useCallback(() => {
    // Limpiar cache para forzar recarga
    const cacheKey = `team_${teamId}`;
    imageCache.delete(cacheKey);
    loadExistingImage();
  }, [loadExistingImage, teamId]);

  /**
   * Limpia el estado de error
   */
  const clearError = useCallback(() => {
    setImageData(prev => ({ ...prev, error: null }));
  }, []);

  // Cargar la imagen al montar el componente o cuando cambie el teamId - con debounce
  useEffect(() => {
    // Limpiar timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce de 100ms para evitar requests múltiples
    timeoutRef.current = setTimeout(() => {
      loadExistingImage();
    }, 100);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadExistingImage]);

  return {
    // Estado
    imageUrl: imageData.imageUrl,
    hasImage: imageData.hasImage,
    loading: imageData.loading,
    error: imageData.error,
    solucionId: imageData.solucionId,
    
    // Funciones
    loadExistingImage,
    updateImageData,
    refreshImage,
    clearError
  };
};

export default useImageManager;