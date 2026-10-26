import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import Swal from 'sweetalert2';
import {
    FaTrash,
    FaEdit,
    FaSave,
    FaBuilding,
    FaLayerGroup,
    FaClipboardList,
    FaUserTie,
    FaBullseye,
    FaPlusCircle
} from 'react-icons/fa';
import { BsPersonSquare } from 'react-icons/bs';

const API_BASE_URL = 'http://localhost:8000/api';
const ITEMS_PER_PAGE = 5;

const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            // El backend exige el token que guarda AdminLogin para las rutas /admin/*
            'Authorization': `Token ${localStorage.getItem('token')}`
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
};

// Lazy-load the modal to avoid increasing initial bundle/parse time
const ChallengeFormModal = lazy(() => import('../../admin/components/ChallengeFormModal'));

const ChallengeAdmin = () => {
    const [challenges, setChallenges] = useState([]);
    const [themes, setThemes] = useState([]);
    const [people, setPeople] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
    const [isCreatingTheme, setIsCreatingTheme] = useState(false);
    const [newThemeName, setNewThemeName] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editingChallengeId, setEditingChallengeId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [challengeFormData, setChallengeFormData] = useState({
        titulo: '',
        descripcion: '',
        contexto: '',
        tema_desafio: '',
        nombrepersona: '',
        edadpersona: '',
        persona_id: null,
        avatar_url: '/avatars/default.png'
    });

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [challengesResponse, themesResponse, peopleResponse] = await Promise.all([
                apiRequest('/admin/desafios/'),
                apiRequest('/admin/temas/'),
                apiRequest('/admin/personas/')
            ]);

            setChallenges(challengesResponse.data.desafios || []);
            setThemes(themesResponse.data || []);
            setPeople(peopleResponse.data || []);
            setCurrentPage(1);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los datos. Verifica la conexion con el servidor.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleChallengeChange = useCallback((e) => {
        const { name, value } = e.target;
        setChallengeFormData((prev) => ({ ...prev, [name]: value }));
    }, []);

    const handlePersonaSelect = useCallback((value) => {
        if (!value) {
            setChallengeFormData((prev) => ({
                ...prev,
                persona_id: null,
                nombrepersona: '',
                edadpersona: '',
                avatar_url: '/avatars/default.png'
            }));
            return;
        }

        const personaId = parseInt(value, 10);
        const persona = people.find((p) => p.id === personaId);
        if (persona) {
            setChallengeFormData((prev) => ({
                ...prev,
                persona_id: persona.id,
                nombrepersona: persona.nombre,
                edadpersona: persona.edad,
                avatar_url: persona.imagenurl || '/avatars/default.png'
            }));
        }
    }, [people]);

    const handleAvatarSelect = useCallback((url) => {
        setChallengeFormData((prev) => ({
            ...prev,
            avatar_url: url,
            persona_id: null
        }));
    }, []);

    const resetForm = useCallback(() => {
        setChallengeFormData({
            titulo: '',
            descripcion: '',
            contexto: '',
            tema_desafio: '',
            nombrepersona: '',
            edadpersona: '',
            persona_id: null,
            avatar_url: '/avatars/default.png'
        });
        setIsCreatingChallenge(false);
        setIsEditing(false);
        setEditingChallengeId(null);
    }, []);

    const createPersonaIfNeeded = useCallback(async () => {
        if (challengeFormData.persona_id) {
            return challengeFormData.persona_id;
        }

        const nombre = challengeFormData.nombrepersona.trim();
        if (!nombre) {
            throw new Error('Debes ingresar el nombre del perfil asociado o seleccionar uno existente.');
        }

        const edad = challengeFormData.edadpersona ? parseInt(challengeFormData.edadpersona, 10) : null;

        const personaResponse = await apiRequest('/admin/personas/', {
            method: 'POST',
            body: JSON.stringify({
                nombre,
                edad,
                imagenurl: challengeFormData.avatar_url,
                contexto: challengeFormData.contexto
            })
        });

        const nuevaPersona = personaResponse?.data;
        if (!nuevaPersona?.id) {
            throw new Error('No se pudo registrar el perfil asociado.');
        }

        setPeople((prev) => (
            prev.some((p) => p.id === nuevaPersona.id)
                ? prev
                : [...prev, {
                      id: nuevaPersona.id,
                      nombre: nuevaPersona.nombre,
                      imagenurl: nuevaPersona.imagenurl,
                      edad: nuevaPersona.edad
                  }]
        ));

        setChallengeFormData((prev) => ({ ...prev, persona_id: nuevaPersona.id }));
        return nuevaPersona.id;
    }, [challengeFormData, setPeople, setChallengeFormData]);

    const handleCreatePersonaAndChallenge = useCallback(async (e) => {
        e.preventDefault();

        if (!challengeFormData.tema_desafio) {
            Swal.fire('Error', 'Debes seleccionar un area para el desafio.', 'error');
            return;
        }

        try {
            let personaId = challengeFormData.persona_id;
            if (!personaId) {
                personaId = await createPersonaIfNeeded();
            }

            const payload = {
                titulo: challengeFormData.titulo,
                descripcion: challengeFormData.descripcion,
                contexto: challengeFormData.contexto,
                tema_desafio_id: parseInt(challengeFormData.tema_desafio, 10),
                persona_id: personaId,
                nombrepersona: challengeFormData.nombrepersona,
                edadpersona: challengeFormData.edadpersona ? parseInt(challengeFormData.edadpersona, 10) : null
            };

            await apiRequest('/admin/desafios/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            Swal.fire('Listo', 'Desafio creado correctamente.', 'success');
            resetForm();
            fetchAllData();
        } catch (error) {
            Swal.fire('Error', `No se pudo crear el desafio: ${error.message}`, 'error');
        }
    }, [challengeFormData, createPersonaIfNeeded]);

    const handleEdit = useCallback((challenge) => {
        const personData = people.find((p) => p.id === challenge.persona_id);

        setChallengeFormData({
            titulo: challenge.titulo,
            descripcion: challenge.descripcion,
            contexto: challenge.contexto || '',
            tema_desafio: challenge.tema_desafio_id,
            nombrepersona: challenge.nombrepersona || challenge.persona_nombre || '',
            edadpersona: challenge.edadpersona || personData?.edad || '',
            persona_id: challenge.persona_id,
            avatar_url: personData?.imagenurl || '/avatars/default.png'
        });

        setIsCreatingChallenge(true);
        setIsEditing(true);
        setEditingChallengeId(challenge.id);
    }, [people]);

    const handleUpdateChallenge = useCallback(async (e) => {
        e.preventDefault();

        if (!challengeFormData.tema_desafio) {
            Swal.fire('Error', 'Debes seleccionar un area para el desafio.', 'error');
            return;
        }

        try {
            let personaId = challengeFormData.persona_id;
            if (!personaId) {
                personaId = await createPersonaIfNeeded();
            }

            const payload = {
                titulo: challengeFormData.titulo,
                descripcion: challengeFormData.descripcion,
                contexto: challengeFormData.contexto,
                tema_desafio_id: parseInt(challengeFormData.tema_desafio, 10),
                persona_id: personaId,
                nombrepersona: challengeFormData.nombrepersona,
                edadpersona: challengeFormData.edadpersona ? parseInt(challengeFormData.edadpersona, 10) : null
            };

            await apiRequest(`/admin/desafios/${editingChallengeId}/`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            Swal.fire('Listo', 'Desafio actualizado correctamente.', 'success');
            resetForm();
            fetchAllData();
        } catch (error) {
            Swal.fire('Error', `No se pudo actualizar el desafio: ${error.message}`, 'error');
        }
    }, [challengeFormData, editingChallengeId, createPersonaIfNeeded]);

    const handleSubmit = isEditing ? handleUpdateChallenge : handleCreatePersonaAndChallenge;

    const handleDelete = useCallback((id, type) => {
        Swal.fire({
            title: `Eliminar ${type}?`,
            text: 'Esta accion no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Si, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const endpoint = type === 'Tema' ? `/admin/temas/${id}/` : `/admin/desafios/${id}/`;
                    await apiRequest(endpoint, { method: 'DELETE' });
                    Swal.fire('Eliminado', `${type} eliminado correctamente.`, 'success');
                    fetchAllData();
                } catch (error) {
                    Swal.fire('Error', `No se pudo eliminar el ${type.toLowerCase()}: ${error.message}`, 'error');
                }
            }
        });
    }, [fetchAllData]);

    const handleCreateTheme = useCallback(async () => {
        if (!newThemeName.trim()) {
            Swal.fire('Advertencia', 'El nombre del area no puede estar vacio.', 'warning');
            return;
        }

        try {
            await apiRequest('/admin/temas/', {
                method: 'POST',
                body: JSON.stringify({
                    nombretema: newThemeName.trim(),
                    descripcion: 'Area creada desde el panel de administracion'
                })
            });

            Swal.fire('Listo', `Area "${newThemeName}" creada.`, 'success');
            setNewThemeName('');
            setIsCreatingTheme(false);
            fetchAllData();
        } catch (error) {
            Swal.fire('Error', `No se pudo crear el area: ${error.message}`, 'error');
        }
    }, [newThemeName]);

    const { totalPages, paginatedChallenges } = useMemo(() => {
        const t = Math.max(1, Math.ceil(challenges.length / ITEMS_PER_PAGE));
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return { totalPages: t, paginatedChallenges: challenges.slice(start, start + ITEMS_PER_PAGE) };
    }, [challenges, currentPage]);

    const goToPage = useCallback((page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    }, [totalPages]);

    const getVisiblePages = useCallback(() => {
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        if (pages.length <= 5) return pages;
        if (currentPage <= 3) return pages.slice(0, 5);
        if (currentPage >= totalPages - 2) return pages.slice(totalPages - 5);
        return pages.slice(currentPage - 3, currentPage + 2);
    }, [totalPages, currentPage]);

    if (isLoading) {
        return (
            <div className="text-center p-8 text-xl font-semibold text-indigo-500">
                Cargando gestion de desafios...
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex items-center gap-3 mb-2 text-indigo-900">
                <FaLayerGroup className="text-3xl" />
                <h1 className="text-3xl font-bold">Gestion de areas y desafios</h1>
            </div>
            <p className="text-sm text-slate-500 mb-6">
                Panel centralizado para administrar areas tematicas, perfiles y desafios conectados a la base de datos.
            </p>

            <div className="bg-white border border-purple-300 rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-6 py-4 flex flex-col gap-1">
                    <p className="text-xs uppercase tracking-widest text-purple-100">Areas tematicas</p>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                            <FaBuilding /> Gestion de areas o temas
                        </h2>
                        <button
                            onClick={() => setIsCreatingTheme(!isCreatingTheme)}
                            className="bg-white text-purple-700 font-semibold py-2 px-4 rounded-xl shadow hover:bg-purple-50 inline-flex items-center gap-2"
                        >
                            <FaPlusCircle className="text-purple-500" />
                            {isCreatingTheme ? 'Cancelar' : 'Crear nueva area'}
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {isCreatingTheme && (
                        <div className="flex flex-col md:flex-row gap-3 mb-5">
                            <input
                                type="text"
                                placeholder="Nombre del area (ej: Energia)"
                                value={newThemeName}
                                onChange={(e) => setNewThemeName(e.target.value)}
                                className="flex-grow p-3 rounded-xl border border-slate-200"
                            />
                            <button
                                onClick={handleCreateTheme}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-xl flex items-center justify-center gap-2"
                            >
                                <FaSave /> Guardar
                            </button>
                        </div>
                    )}

                    <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
                        <div className="flex items-center justify-between text-slate-700 text-xs uppercase tracking-widest font-semibold mb-3 bg-white/70 rounded-xl px-4 py-2">
                            <span>Areas activas ({themes.length})</span>
                            <span>Acciones</span>
                        </div>
                        <div className="max-h-56 overflow-auto pr-2 divide-y divide-purple-200">
                            {themes.map((theme) => (
                                <div key={theme.id} className="flex items-center justify-between py-2 text-slate-700 text-sm">
                                    <span>{theme.nombretema}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="text-purple-600 hover:text-purple-800 cursor-not-allowed"
                                            title="Editar (pronto)"
                                            disabled
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(theme.id, 'Tema')}
                                            className="text-red-500 hover:text-red-700"
                                            title="Eliminar"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl mt-8 border border-emerald-200 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-emerald-100">Desafios</p>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <FaBullseye /> Desafios activos ({challenges.length})
                        </h2>
                        <p className="text-sm text-emerald-100/80">Administra los retos vigentes y su informacion asociada.</p>
                    </div>
                    <button
                        onClick={() => setIsCreatingChallenge(true)}
                        className="inline-flex items-center gap-2 bg-white text-emerald-600 border border-emerald-200 font-semibold px-5 py-2 rounded-xl shadow hover:bg-emerald-50"
                    >
                        <BsPersonSquare className="text-lg" /> Registrar nuevo desafio
                    </button>
                </div>

                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-indigo-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                    <span className="flex items-center gap-2"><FaClipboardList /> Titulo</span>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                    <span className="flex items-center gap-2"><FaLayerGroup /> Area</span>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                    <span className="flex items-center gap-2"><FaUserTie /> Persona</span>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                    <span className="flex items-center gap-2"><FaEdit /> Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {paginatedChallenges.map((challenge) => (
                                <tr key={challenge.id} className={challenge.id === editingChallengeId ? 'bg-yellow-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                                        {challenge.titulo}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {challenge.tema_nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {challenge.nombrepersona || challenge.persona_nombre}
                                        {challenge.edadpersona ? ` (${challenge.edadpersona})` : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleEdit(challenge)}
                                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                                title="Editar"
                                                disabled={isEditing}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(challenge.id, 'Desafio')}
                                                className="text-red-600 hover:text-red-900"
                                                title="Eliminar"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 text-sm text-slate-600">
                        <div>
                            Mostrando {paginatedChallenges.length} de {challenges.length} registros
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                className="px-3 py-1 rounded-full border border-emerald-200 hover:bg-emerald-50 disabled:opacity-40"
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </button>
                            {getVisiblePages().map((page) => (
                                <button
                                    key={page}
                                    onClick={() => goToPage(page)}
                                    className={`px-3 py-1 rounded-full border ${
                                        page === currentPage
                                            ? 'bg-emerald-500 text-white border-emerald-500'
                                            : 'border-emerald-200 hover:bg-emerald-50'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                className="px-3 py-1 rounded-full border border-emerald-200 hover:bg-emerald-50 disabled:opacity-40"
                                disabled={currentPage === totalPages}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Suspense fallback={null}>
                <ChallengeFormModal
                    open={isCreatingChallenge}
                    onClose={resetForm}
                    onSubmit={handleSubmit}
                    isEditing={isEditing}
                    editingId={editingChallengeId}
                    challengeFormData={challengeFormData}
                    handleChallengeChange={handleChallengeChange}
                    handlePersonaSelect={handlePersonaSelect}
                    handleAvatarSelect={handleAvatarSelect}
                    themes={themes}
                    people={people}
                />
            </Suspense>
        </div>
    );
};

export default ChallengeAdmin;
