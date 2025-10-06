import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import type { Category } from '../api/types';
import { formatDateTime, formatNumber } from '../utils/format';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
};

type CategoryFormState = typeof emptyForm & { reports_count?: number; search_count?: number };

export function CategoriesPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get<Category[]>('/admin/categories'),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      is_active: category.is_active,
      reports_count: category.reports_count,
      search_count: category.search_count,
    });
  };

  const handleChange = (field: keyof CategoryFormState, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!form.name || !form.slug) {
        throw new Error('Completa el nombre y el slug de la categoría');
      }

      if (editingId) {
        await api.put(`/admin/categories/${editingId}`, {
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          is_active: form.is_active,
          reports_count: form.reports_count,
          search_count: form.search_count,
        });
        setSuccess('Categoría actualizada correctamente');
      } else {
        await api.post('/admin/categories', {
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          is_active: form.is_active,
        });
        setSuccess('Categoría creada con éxito');
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la categoría');
    }
  };

  return (
    <div className="grid grid--two-cols">
      <section className="card">
        <h2 className="card__title">Categorías</h2>
        {categoriesQuery.isLoading && <p>Cargando categorías…</p>}
        {categoriesQuery.isError && (
          <p className="card__error">No se pudieron cargar las categorías: {(categoriesQuery.error as Error).message}</p>
        )}

        {categoriesQuery.data && categoriesQuery.data.length === 0 && <p>No hay categorías registradas.</p>}

        {categoriesQuery.data && categoriesQuery.data.length > 0 && (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Reportes</th>
                  <th>Búsquedas</th>
                  <th>Estado</th>
                  <th>Actualizado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categoriesQuery.data.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td>{formatNumber(category.reports_count)}</td>
                    <td>{formatNumber(category.search_count)}</td>
                    <td>{category.is_active ? 'Activa' : 'Inactiva'}</td>
                    <td>{formatDateTime(category.updated_at)}</td>
                    <td>
                      <button className="button button--ghost" type="button" onClick={() => handleEdit(category)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">{editingId ? 'Editar categoría' : 'Nueva categoría'}</h2>
        <p className="card__subtitle">
          {editingId
            ? 'Actualiza la información de la categoría seleccionada.'
            : 'Crea categorías para organizar los reportes del sistema.'}
        </p>

        {error && <p className="card__error">{error}</p>}
        {success && <p className="card__success">{success}</p>}

        <form className="form" onSubmit={handleSubmit}>
          <label className="form__label">
            Nombre
            <input
              className="form__input"
              type="text"
              value={form.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="Nombre descriptivo"
              required
            />
          </label>

          <label className="form__label">
            Slug
            <input
              className="form__input"
              type="text"
              value={form.slug}
              onChange={(event) => handleChange('slug', event.target.value)}
              placeholder="ej. fraude-digital"
              required
            />
          </label>

          <label className="form__label">
            Descripción
            <textarea
              className="form__textarea"
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder="Explica el tipo de fraude cubierto por esta categoría"
              rows={3}
            />
          </label>

          <label className="form__checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => handleChange('is_active', event.target.checked)}
            />
            Categoría activa para nuevos reportes
          </label>

          {editingId && (
            <div className="form__grid">
              <label className="form__label">
                Reportes asociados
                <input
                  className="form__input"
                  type="number"
                  min={0}
                  value={form.reports_count ?? 0}
                  onChange={(event) => handleChange('reports_count', Number(event.target.value))}
                />
              </label>
              <label className="form__label">
                Búsquedas
                <input
                  className="form__input"
                  type="number"
                  min={0}
                  value={form.search_count ?? 0}
                  onChange={(event) => handleChange('search_count', Number(event.target.value))}
                />
              </label>
            </div>
          )}

          <div className="form__actions">
            {editingId && (
              <button className="button button--ghost" type="button" onClick={resetForm}>
                Cancelar edición
              </button>
            )}
            <button className="button button--primary" type="submit">
              {editingId ? 'Actualizar' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
