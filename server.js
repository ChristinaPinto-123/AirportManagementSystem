const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
const app = express();

const dbConfig = {
    user: "system",
    password: "12345",
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
            `SELECT flight_no, arrivaling_from, departure_time, departing_to, arrival_time, status, gate_no FROM flights`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const summaryData = await connection.execute(
            `SELECT get_flight_summary() AS summary FROM dual`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const rawRow = summaryData.rows[0];
        const summaryText = rawRow.SUMMARY || rawRow.summary || Object.values(rawRow)[0];

        res.json({
            flights: flightData.rows,
            summary: summaryText
        });

    } catch (err) {
        console.error(err); 
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
        
        const setString = Object.keys(data)
            .map((key, i) => `${key} = :${i + 1}`)
            .join(', ');
        
        const values = Object.values(data);
        values.push(idValue); 

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

//---LATE FLIGHT REPORTS---
app.get('/api/report', async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const result = await conn.execute(
        `BEGIN get_late_night_report(:cursor); END;`, 
        { cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT } }
);

        const resultSet = result.outBinds.cursor;
        const rows = [];
        let row;

        while ((row = await resultSet.getRow())) {
            rows.push(row);
        }

    
        await resultSet.close();

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    } finally {
        if (conn) await conn.close();
    }
});

app.listen(3000, () => {
    console.log("Aero Tracker running at http://localhost:3000");
});
