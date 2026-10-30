import { API_URL } from '../../../config';
import { useState, useEffect } from 'react';

export const useOptimizedGroupBuilder = () => {
  const [selectedGame, setSelectedGame] = useState('');
  const [students, setStudents] = useState([]);
  const [groupSettings, setGroupSettings] = useState({
    groupCount: 3, // Número de grupos (1-4 máximo)
    groupSize: 0, // Se calcula automáticamente
    randomAssignment: true,
    balanceSkills: false
  });
  const [isGenerating, setIsGenerating] = useState(false);
  
  // CSV related state
  const [csvFile, setCsvFile] = useState(null);
  const [parsedCsv, setParsedCsv] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // API Base URL
  const API_BASE = `${API_URL}/`;

  // Generar código de sala
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    for (let i = 0; i < 2; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    return segments.join('-');
  };

  const [roomCode] = useState(() => generateRoomCode());

  // Estado optimizado para @dnd-kit
  const [containers, setContainers] = useState({
    'unassigned': [], // Lista inicial
    'grupo-1': [],
    'grupo-2': [],
    'grupo-3': [],
    'grupo-4': []
  });

  // Generar iniciales para el avatar
  const getInitials = (nombre, apellido) => {
    const n = nombre ? nombre.trim().charAt(0).toUpperCase() : '';
    const a = apellido ? apellido.trim().charAt(0).toUpperCase() : '';
    return n && a ? `${n}${a}` : n || a || '??';
  };

  // Generar avatar con color basado en el nombre
  const generateAvatar = (nombre, apellido) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
      'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500'
    ];
    
    const fullName = `${nombre}${apellido}`.toLowerCase();
    const hash = fullName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Procesar estudiantes desde CSV
  const processStudentsFromCsv = (csvData) => {
    const processedStudents = csvData.map((student, index) => ({
      id: `csv-${index + 1}`,
      originalIndex: index, // Para debugging
      correo: student.correo,
      rut: student.rut,
      nombre: student.nombre,
      apellido_paterno: student.apellido_paterno,
      apellido_materno: student.apellido_materno,
      name: `${student.nombre} ${student.apellido_paterno} ${student.apellido_materno}`.trim(),
      displayName: `${student.nombre} ${student.apellido_paterno}`.trim(),
      initials: getInitials(student.nombre, student.apellido_paterno),
      skills: [],
      level: 'básico',
      avatar: generateAvatar(student.nombre, student.apellido_paterno)
    }));
    
    // VALIDACIÓN: Verificar que no hay IDs duplicados
    const ids = processedStudents.map(s => s.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.error('🚨 PROBLEMA: IDs duplicados detectados!', {
        totalIds: ids.length,
        uniqueIds: uniqueIds.size,
        ids
      });
    } else {
      console.log('✅ Validación de IDs: Todos son únicos', {
        totalStudents: processedStudents.length,
        sampleIds: ids.slice(0, 5),
        sampleStudents: processedStudents.slice(0, 3).map(s => ({
          id: s.id,
          originalIndex: s.originalIndex,
          name: s.displayName
        }))
      });
    }
    
    // LIMPIAR ESTUDIANTES ANTERIORES - Resetear completamente
    setStudents(processedStudents);
    setContainers({
      unassigned: processedStudents,
      'grupo-1': [],
      'grupo-2': [],
      'grupo-3': [],
      'grupo-4': []
    });
  };

  // Manejar archivo CSV/Excel
  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0];
    setCsvFile(file);
    setCsvError('');
    setParsedCsv([]);
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          setCsvError('El archivo debe tener al menos 2 líneas (encabezados + datos)');
          return;
        }
        
        // Detectar delimitador
        const delimiter = text.includes(';') ? ';' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
        
        // Validar formato esperado
        const expectedHeaders = ['correo', 'rut', 'nombre', 'apellido paterno', 'apellido materno'];
        const hasRequiredHeaders = expectedHeaders.every(expected => 
          headers.some(header => header.includes(expected.replace(' ', '_')) || header.includes(expected))
        );
        
        if (!hasRequiredHeaders) {
          setCsvError('El archivo debe contener las columnas: Correo, RUT, Nombre, Apellido Paterno, Apellido Materno');
          return;
        }
        
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim());
          if (cols.length < headers.length) continue;
          
          const obj = {};
          headers.forEach((h, idx) => { 
            obj[h] = cols[idx] || ''; 
          });
          
          // Normalizar campos clave
          const normalizedRow = {
            correo: obj.correo || obj.email || '',
            rut: obj.rut || '',
            nombre: obj.nombre || '',
            apellido_paterno: obj['apellido paterno'] || obj.apellido_paterno || '',
            apellido_materno: obj['apellido materno'] || obj.apellido_materno || ''
          };
          
          // Validar datos mínimos
          if (normalizedRow.correo && normalizedRow.nombre) {
            rows.push(normalizedRow);
          }
        }
        
        if (!rows.length) {
          setCsvError('No se encontraron filas válidas con correo y nombre');
        } else {
          setParsedCsv(rows);
          // Procesar estudiantes inmediatamente para el frontend
          processStudentsFromCsv(rows);
          setUploadResult({ total: rows.length, procesados: rows.length });
        }
      } catch (err) {
        setCsvError('Error parseando CSV: ' + err.message);
      }
    };
    reader.onerror = () => setCsvError('No se pudo leer el archivo');
    reader.readAsText(file, 'UTF-8');
  };

  // Enviar al backend (opcional)
  const sendCsvToBackend = async () => {
    if (!parsedCsv.length) return;
    setUploading(true);
    setCsvError('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        estudiantes: parsedCsv.map(e => ({
          correo: e.correo || '',
          rut: e.rut || '',
          nombre: e.nombre || '',
          apellido_paterno: e.apellido_paterno || '',
          apellido_materno: e.apellido_materno || ''
        }))
      };
      
      const resp = await fetch(API_BASE + 'estudiantes/bulk_create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Error HTTP ' + resp.status);
      }
      
      const data = await resp.json();
      setUploadResult({ 
        total: data.total, 
        nuevos: data.estudiantes.filter(e => e.nuevo).length,
        backend: true
      });
    } catch (err) {
      setCsvError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // REMOVIDO: Auto-redistribución automática al cambiar cantidad de grupos
  // La redistribución ahora solo ocurre cuando el usuario hace clic en "Redistribuir"
  // useEffect(() => {
  //   const totalStudents = Object.values(containers).reduce((acc, container) => acc + container.length, 0);
  //   if (totalStudents > 0) {
  //     redistributeGroups();
  //   }
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [groupSettings.groupCount]);

  // No inicializar con datos dummy - solo con CSV

  // Crear grupos vacíos sin redistribuir estudiantes (solo cuando cambia cantidad)
  const createEmptyGroups = (newGroupCount) => {
    // Calcular total de estudiantes de todos los contenedores
    const totalStudents = Object.values(containers).reduce((acc, container) => acc + container.length, 0);
    
    // Calcular tamaño base y resto para distribución equitativa
    const baseSize = Math.floor(totalStudents / newGroupCount);
    const remainder = totalStudents % newGroupCount;
    const maxSize = baseSize + (remainder > 0 ? 1 : 0);
    
    // Actualizar configuración de grupos
    setGroupSettings(prev => ({
      ...prev,
      groupCount: newGroupCount,
      groupSize: maxSize
    }));

    // Preservar estudiantes existentes y solo crear/remover contenedores vacíos
    setContainers(prev => {
      const newContainers = {
        'unassigned': prev.unassigned || [],
        'grupo-1': prev['grupo-1'] || [],
        'grupo-2': prev['grupo-2'] || [],
        'grupo-3': prev['grupo-3'] || [],
        'grupo-4': prev['grupo-4'] || []
      };

      // Si reducimos grupos, mover estudiantes de grupos eliminados a "no asignados"
      if (newGroupCount < 4) {
        for (let i = newGroupCount + 1; i <= 4; i++) {
          const groupId = `grupo-${i}`;
          if (newContainers[groupId] && newContainers[groupId].length > 0) {
            newContainers.unassigned.push(...newContainers[groupId]);
            newContainers[groupId] = [];
          }
        }
      }

      return newContainers;
    });
  };

  // Generar grupos automáticamente con distribución equitativa mejorada
  const generateAutoGroups = () => {
    // Recoger todos los estudiantes de todos los contenedores
    const allStudentsFromContainers = [];
    Object.keys(containers).forEach(containerId => {
      allStudentsFromContainers.push(...containers[containerId]);
    });
    
    // Si no hay estudiantes, usar los del estado
    const studentsToDistribute = allStudentsFromContainers.length > 0 ? allStudentsFromContainers : students;
    
    if (studentsToDistribute.length === 0) return;
    
    setIsGenerating(true);
    
    setTimeout(() => {
      const shuffled = [...studentsToDistribute].sort(() => Math.random() - 0.5);
      const groupsToUse = Math.min(groupSettings.groupCount, 4);
      
      // LÓGICA DE DISTRIBUCIÓN EQUITATIVA MEJORADA
      const totalStudents = shuffled.length;
      const baseSize = Math.floor(totalStudents / groupsToUse); // Parte entera
      const remainder = totalStudents % groupsToUse; // Estudiantes restantes
      
      // Resetear todos los contenedores
      const newContainers = {
        unassigned: [],
        'grupo-1': [],
        'grupo-2': [],
        'grupo-3': [],
        'grupo-4': []
      };
      
      // Distribuir estudiantes de manera equilibrada
      let studentIndex = 0;
      for (let groupNum = 1; groupNum <= groupsToUse; groupNum++) {
        const groupId = `grupo-${groupNum}`;
        
        // Cada grupo recibe al menos 'baseSize' estudiantes
        let groupSize = baseSize;
        
        // Los primeros 'remainder' grupos reciben un estudiante extra
        if (groupNum <= remainder) {
          groupSize += 1;
        }
        
        // Asignar estudiantes al grupo
        for (let i = 0; i < groupSize && studentIndex < shuffled.length; i++) {
          newContainers[groupId].push(shuffled[studentIndex]);
          studentIndex++;
        }
      }
      
      setContainers(newContainers);
      setIsGenerating(false);
    }, 800);
  };

  // Reorganizar grupos cuando cambia la cantidad
  const redistributeGroups = () => {
    const allStudents = [];
    
    // Recopilar todos los estudiantes de todos los contenedores
    Object.keys(containers).forEach(containerId => {
      allStudents.push(...containers[containerId]);
    });
    
    if (allStudents.length === 0) return;
    
    // Redistribuir en grupos nuevos
    const groupsToUse = Math.min(groupSettings.groupCount, 4);
    const studentsPerGroup = Math.ceil(allStudents.length / groupsToUse);
    
    const newContainers = {
      unassigned: [],
      'grupo-1': [],
      'grupo-2': [],
      'grupo-3': [],
      'grupo-4': []
    };
    
    // Distribuir estudiantes equitativamente
    allStudents.forEach((student, index) => {
      const groupIndex = Math.floor(index / studentsPerGroup) + 1;
      if (groupIndex <= groupsToUse) {
        newContainers[`grupo-${groupIndex}`].push(student);
      } else {
        // Si hay estudiantes extra, los distribuimos en los grupos existentes
        const targetGroup = (index % groupsToUse) + 1;
        newContainers[`grupo-${targetGroup}`].push(student);
      }
    });
    
    setContainers(newContainers);
  };

  // Manejar drag & drop con @dnd-kit
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const studentId = active.id;
    const targetContainerId = over.id;

    console.log('🔧 Drag End Debug:', {
      studentId,
      targetContainerId,
      sourceStudentName: containers[Object.keys(containers).find(key => 
        containers[key].some(s => s.id === studentId))]?.find(s => s.id === studentId)?.displayName
    });

    // Encontrar contenedor origen
    let sourceContainerId = null;
    let studentObj = null;

    for (const containerId in containers) {
      const foundStudent = containers[containerId].find(s => s.id === studentId);
      if (foundStudent) {
        sourceContainerId = containerId;
        studentObj = foundStudent;
        console.log('✅ Estudiante encontrado:', {
          sourceContainer: containerId,
          studentFound: { id: foundStudent.id, name: foundStudent.displayName || foundStudent.name }
        });
        break;
      }
    }

    if (!sourceContainerId || sourceContainerId === targetContainerId) {
      console.log('❌ Operación cancelada:', { sourceContainerId, targetContainerId });
      return;
    }

    // Verificar límites con cálculo equitativo correcto
    const targetContainer = containers[targetContainerId];
    const totalStudents = Object.values(containers).reduce((acc, container) => acc + container.length, 0);
    const maxSizePerGroup = Math.ceil(totalStudents / groupSettings.groupCount);
    
    if (targetContainerId !== 'unassigned' && targetContainer.length >= maxSizePerGroup + 1) {
      console.log('❌ Límite de capacidad alcanzado');
      return; // No permitir si excede capacidad equitativa
    }

    console.log('🔄 Antes de actualizar containers:', {
      sourceContainer: {
        id: sourceContainerId,
        students: containers[sourceContainerId].map(s => ({ id: s.id, name: s.displayName || s.name }))
      },
      targetContainer: {
        id: targetContainerId,
        students: containers[targetContainerId].map(s => ({ id: s.id, name: s.displayName || s.name }))
      },
      movingStudent: { id: studentObj.id, name: studentObj.displayName || studentObj.name }
    });

    // Actualizar contenedores
    setContainers(prevContainers => {
      console.log('📝 Estado previo completo:', {
        prevContainers: Object.keys(prevContainers).reduce((acc, key) => ({
          ...acc,
          [key]: prevContainers[key].map(s => ({ 
            id: s.id, 
            name: s.displayName || s.name,
            originalIndex: s.originalIndex || 'no-index'
          }))
        }), {}),
        studentToMove: { 
          id: studentObj.id, 
          name: studentObj.displayName || studentObj.name,
          originalIndex: studentObj.originalIndex || 'no-index'
        }
      });

      // Crear copias profundas para evitar problemas de referencia
      const sourceContainer = prevContainers[sourceContainerId];
      const targetContainer = prevContainers[targetContainerId];
      
      // Encontrar el índice exacto del estudiante para asegurar que se remueve el correcto
      const studentIndex = sourceContainer.findIndex(s => s.id === studentId);
      console.log('🔍 Índice del estudiante encontrado:', studentIndex);
      
      if (studentIndex === -1) {
        console.error('🚨 ERROR: Estudiante no encontrado en contenedor origen!');
        return prevContainers; // No hacer cambios si hay error
      }

      // Crear nueva lista origen SIN el estudiante (usando el índice exacto)
      const newSourceList = [
        ...sourceContainer.slice(0, studentIndex),
        ...sourceContainer.slice(studentIndex + 1)
      ];
      
      // Crear nueva lista destino CON el estudiante (copia profunda)
      const studentCopy = { 
        ...studentObj,
        // Agregar timestamp para tracking
        movedAt: Date.now()
      };
      const newTargetList = [...targetContainer, studentCopy];
      
      console.log('🔄 Después de filtrar/agregar (con índices):', {
        newSourceList: newSourceList.map((s, idx) => ({ 
          index: idx, 
          id: s.id, 
          name: s.displayName || s.name 
        })),
        newTargetList: newTargetList.map((s, idx) => ({ 
          index: idx, 
          id: s.id, 
          name: s.displayName || s.name 
        }))
      });
      
      const newContainers = {
        ...prevContainers,
        [sourceContainerId]: newSourceList,
        [targetContainerId]: newTargetList,
      };

      console.log('🎯 Estado final de containers:', Object.keys(newContainers).reduce((acc, key) => ({
        ...acc,
        [key]: newContainers[key].map((s, idx) => ({ 
          index: idx, 
          id: s.id, 
          name: s.displayName || s.name 
        }))
      }), {}));
      
      return newContainers;
    });
  };

  // Generar grupos para compatibilidad con capacidad equitativa corregida
  const getGroupsFromContainers = () => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500'];
    const groups = [];
    
    // Calcular capacidad equitativa total de estudiantes
    const totalStudents = Object.values(containers).reduce((acc, container) => acc + container.length, 0);
    const baseCapacity = Math.ceil(totalStudents / groupSettings.groupCount);
    
    for (let i = 1; i <= groupSettings.groupCount; i++) {
      const groupId = `grupo-${i}`;
      const students = containers[groupId] || [];
      
      groups.push({
        id: groupId,
        name: `Equipo ${i}`,
        students: students,
        color: colors[i - 1],
        maxSize: baseCapacity + 1  // +1 para flexibilidad en redistribución
      });
    }
    
    return groups;
  };

  return {
    // State
    selectedGame,
    students,
    groups: getGroupsFromContainers(),
    groupSettings,
    isGenerating,
    csvFile,
    parsedCsv,
    csvError,
    uploading,
    uploadResult,
    containers,
    
    // Setters
    setSelectedGame,
    setStudents,
    setGroupSettings,
    
    // Functions
    handleCsvFileChange,
    sendCsvToBackend,
    generateAutoGroups,
    createEmptyGroups,
    handleDragEnd,
    redistributeGroups
  };
};

export default useOptimizedGroupBuilder;