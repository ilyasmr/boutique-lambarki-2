import pool from '../db.js';

export async function getNotes(req, res) {
  try {
    const result = await pool.query('SELECT * FROM notes ORDER BY date DESC');
    const notes = result.rows.map(r => ({
      id: r.id,
      personName: r.person_name,
      items: r.items,
      date: r.date,
      version: r.version
    }));
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createNote(req, res) {
  const { id, personName, items, date, version = 1 } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notes (id, person_name, items, date, version)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, personName, JSON.stringify(items), date, version]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateNote(req, res) {
  const { id } = req.params;
  const { personName, items, date, version } = req.body;
  try {
    const result = await pool.query(
      `UPDATE notes SET person_name=$1, items=$2, date=$3, version=$4 WHERE id=$5 RETURNING *`,
      [personName, JSON.stringify(items), date, version, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteNote(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM notes WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
