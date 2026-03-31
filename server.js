const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
const app = express();

const dbConfig = {
    user: "system",
    password: "Enter_Your_Paassword",
    connectString: "localhost:1521/xepdb1"
};

app.use(express.static('public'));
app.use(express.json());

// --- DATABASE ROUTES ---

app.get('/api/passengers', async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const result = await conn.execute(`SELECT passport_no, fname, minit, lname, flight_no FROM passengers`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
    finally { if (conn) await conn.close(); }
});

app.get('/api/flights', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

    
        const flightData = await connection.execute(
            `SELECT flight_no, arrivaling_from, departing_to, status, gate_no FROM flights`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

    
        const summaryData = await connection.execute(
            `SELECT get_flight_summary() AS summary FROM dual`
        );

        
        res.json({
            flights: flightData.rows,
            summary: summaryData.rows[0][0] 
        });

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/api/employees', async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const result = await conn.execute(`SELECT emp_id, fname, lname, designation, iata_code, salary FROM employee`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
    finally { if (conn) await conn.close(); }
});

app.get('/api/tickets', async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const result = await conn.execute(
            `SELECT pnr, seat_no, class, price, passport_no FROM tickets`, 
            [], 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (conn) await conn.close();
    }
});

// --- GENERIC ADD ROUTE ---
app.post('/api/add', async (req, res) => {
    const { table, data } = req.body;
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const keys = Object.keys(data).join(', ');
        const binds = Object.keys(data).map((_, i) => `:${i + 1}`).join(', ');
        const values = Object.values(data);

        await conn.execute(`INSERT INTO ${table} (${keys}) VALUES (${binds})`, values, { autoCommit: true });
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
    finally { if (conn) await conn.close(); }
});

// --- GENERIC DELETE ROUTE ---
app.delete('/api/delete/:table/:idColumn/:idValue', async (req, res) => {
    const { table, idColumn, idValue } = req.params;
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        await conn.execute(`DELETE FROM ${table} WHERE ${idColumn} = :1`, [idValue], { autoCommit: true });
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
    finally { if (conn) await conn.close(); }
});

// --- GENERIC UPDATE ROUTE ---
app.put('/api/update', async (req, res) => {
    const { table, data, idColumn, idValue } = req.body;
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        
        // Build the SET string: col1 = :1, col2 = :2, etc.
        const setString = Object.keys(data)
            .map((key, i) => `${key} = :${i + 1}`)
            .join(', ');
        
        const values = Object.values(data);
        values.push(idValue); // Add the ID for the WHERE clause at the end

        const sql = `UPDATE ${table} SET ${setString} WHERE ${idColumn} = :${values.length}`;
        
        await conn.execute(sql, values, { autoCommit: true });
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).send(err.message); 
    } finally { 
        if (conn) await conn.close(); 
    }
});

app.listen(3000, () => {
    console.log("🚀 SkyGate Web running at http://localhost:3000");
});
