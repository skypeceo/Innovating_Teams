import { API_URL } from '../../../config';
import { useState, useEffect } from 'react';

export const useGroupBuilder = () => {
  const [selectedGame, setSelectedGame] = useState('');
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
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

  // Datos de ejemplo de estudiantes
  const exampleStudents = [
    { id: 1, name: 'Ana García', skills: ['liderazgo', 'comunicación'], level: 'avanzado' },
    { id: 2, name: 'Luis Pérez', skills: ['técnico', 'análisis'], level: 'intermedio' },
    { id: 3, name: 'María López', skills: ['creatividad', 'diseño'], level: 'avanzado' },
    { id: 4, name: 'Carlos Ruiz', skills: ['organización', 'planificación'], level: 'básico' },
    { id: 5, name: 'Elena Torres', skills: ['comunicación', 'negociación'], level: 'intermedio' },
    { id: 6, name: 'Diego Morales', skills: ['técnico', 'innovación'], level: 'avanzado' },
    { id: 7, name: 'Sofia Hernández', skills: ['liderazgo', 'gestión'], level: 'intermedio' },
    { id: 8, name: 'Roberto Silva', skills: ['creatividad', 'presentación'], level: 'básico' },
    { id: 9, name: 'Valentina Castro', skills: ['análisis', 'investigación'], level: 'avanzado' },
    { id: 10, name: 'Andrés Vega', skills: ['comunicación', 'liderazgo'], level: 'intermedio' },
    { id: 11, name: 'Catalina Rojas', skills: ['creatividad', 'innovación'], level: 'básico' },
    { id: 12, name: 'Sebastián Muñoz', skills: ['técnico', 'organización'], level: 'avanzado' }
  ];

  const API_BASE = `${API_URL}/`;

  useEffect(() => {
    setStudents(exampleStudents);
  }, []);

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

  // Procesar estudiantes desde CSV para el frontend
  const processStudentsFromCsv = (csvData) => {
    const processedStudents = csvData.map((student, index) => ({
      id: index + 1,
      // Datos completos para backend (se guardan pero no se muestran en chips)
      correo: student.correo,
      rut: student.rut,
      nombre: student.nombre,
      apellido_paterno: student.apellido_paterno,
      apellido_materno: student.apellido_materno,
      
      // Datos para mostrar en chips: solo nombre + apellido paterno
      displayName: `${student.nombre} ${student.apellido_paterno}`.trim(),
      initials: getInitials(student.nombre, student.apellido_paterno),
      
      // Compatibilidad con sistema existente
      name: `${student.nombre} ${student.apellido_paterno} ${student.apellido_materno}`.trim(),
      skills: [],
      level: 'básico',
      avatar: generateAvatar(student.nombre, student.apellido_paterno)
    }));
    
    setStudents(processedStudents);
    setGroups([]);
  };

  // Generar iniciales para el avatar
  const getInitials = (nombre, apellido) => {
    const n = nombre ? nombre.charAt(0).toUpperCase() : '';
    const a = apellido ? apellido.charAt(0).toUpperCase() : '';
    return `${n}${a}`;
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

  // Funciones para drag & drop
  const moveStudentToGroup = (studentId, targetGroupId) => {
    setGroups(prevGroups => {
      const newGroups = [...prevGroups];
      
      // Encontrar el estudiante y removerlo de su grupo actual
      let studentToMove = null;
      newGroups.forEach(group => {
        const studentIndex = group.students.findIndex(s => s.id === studentId);
        if (studentIndex !== -1) {
          studentToMove = group.students.splice(studentIndex, 1)[0];
        }
      });
      
      // Agregar el estudiante al grupo destino si hay espacio
      if (studentToMove) {
        const targetGroup = newGroups.find(g => g.id === targetGroupId);
        if (targetGroup && targetGroup.students.length < (targetGroup.maxSize || 10)) {
          targetGroup.students.push(studentToMove);
        } else if (studentToMove) {
          // Si no se puede mover, devolver al primer grupo con espacio
          const availableGroup = newGroups.find(g => g.students.length < (g.maxSize || 10));
          if (availableGroup) {
            availableGroup.students.push(studentToMove);
          }
        }
      }
      
      return newGroups;
    });
  };

  const handleDragStart = (e, student) => {
    e.dataTransfer.setData('application/json', JSON.stringify(student));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, targetGroupId) => {
    e.preventDefault();
    try {
      const studentData = JSON.parse(e.dataTransfer.getData('application/json'));
      moveStudentToGroup(studentData.id, targetGroupId);
    } catch (error) {
      console.error('Error en drag & drop:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

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
        }
      } catch (err) {
        setCsvError('Error parseando CSV: ' + err.message);
      }
    };
    reader.onerror = () => setCsvError('No se pudo leer el archivo');
    reader.readAsText(file, 'UTF-8');
  };

  const sendCsvToBackend = async () => {
    if (!parsedCsv.length) return;
    setUploading(true);
    setCsvError('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        estudiantes: parsedCsv.map(e => ({
          correo: e.correo || e.email || '',
          rut: e.rut || '',
          nombre: e.nombre || '',
          apellido_paterno: e.apellido_paterno || e.apellido || '',
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
      
      // Mapear respuesta del backend manteniendo información completa
      const mapped = data.estudiantes.map(est => ({
        id: est.id,
        correo: est.correo,
        rut: est.rut || '',
        nombre: est.nombre,
        apellido_paterno: est.apellido ? est.apellido.split(' ')[0] || '' : '',
        apellido_materno: est.apellido ? est.apellido.split(' ').slice(1).join(' ') || '' : '',
        
        // Para mostrar en chips: solo nombre + apellido paterno
        displayName: `${est.nombre || ''} ${est.apellido ? est.apellido.split(' ')[0] || '' : ''}`.trim(),
        initials: getInitials(est.nombre, est.apellido ? est.apellido.split(' ')[0] : ''),
        
        // Compatibilidad
        name: `${est.nombre || ''} ${est.apellido || ''}`.trim(),
        skills: [],
        level: 'básico',
        avatar: generateAvatar(est.nombre, est.apellido ? est.apellido.split(' ')[0] : '')
      }));
      
      setStudents(mapped);
      setGroups([]);
      setUploadResult({ total: data.total, nuevos: data.estudiantes.filter(e => e.nuevo).length });
    } catch (err) {
      setCsvError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const generatePreview = () => {
    if (students.length === 0) return;
    
    setIsGenerating(true);
    
    setTimeout(() => {
      // Usar la cantidad de grupos seleccionada (máximo 4)
      const numberOfGroups = Math.min(groupSettings.groupCount, 4);
      const totalStudents = students.length;
      const calculatedGroupSize = Math.ceil(totalStudents / numberOfGroups);
      
      // Algoritmo mejorado de asignación de grupos
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      
      // Distribuir estudiantes de manera equilibrada
      const newGroups = [];
      const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500'
      ];
      
      // Inicializar grupos
      for (let i = 0; i < numberOfGroups; i++) {
        newGroups.push({
          id: `group-${i + 1}`,
          name: `Equipo ${i + 1}`,
          students: [],
          color: colors[i % colors.length],
          maxSize: calculatedGroupSize + 2 // Permitir flexibilidad
        });
      }
      
      // Distribuir estudiantes de manera circular para equilibrar grupos
      shuffledStudents.forEach((student, index) => {
        const groupIndex = index % numberOfGroups;
        newGroups[groupIndex].students.push(student);
      });
      
      setGroups(newGroups);
      setGroupSettings(prev => ({
        ...prev,
        groupSize: calculatedGroupSize
      }));
      setIsGenerating(false);
    }, 1500);
  };

  const canDropInGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group && group.students.length < (group.maxSize || 10);
  };

  return {
    // State
    selectedGame,
    students,
    groups,
    groupSettings,
    isGenerating,
    csvFile,
    parsedCsv,
    csvError,
    uploading,
    uploadResult,
    roomCode,
    
    // Setters
    setSelectedGame,
    setStudents,
    setGroups,
    setGroupSettings,
    
    // Functions
    handleCsvFileChange,
    sendCsvToBackend,
    generatePreview,
    
    // Drag & Drop Functions
    moveStudentToGroup,
    handleDragStart,
    handleDrop,
    handleDragOver,
    canDropInGroup
  };
};

export default useGroupBuilder;