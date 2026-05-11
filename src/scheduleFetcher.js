const extractDates = (csvText, keyword) => {
    const lines = csvText.split('\n');
    let dates = [];

    // Scan all lines to find the ones serving as date headers (usually rows 1-5)
    let headerLines = lines.slice(0, 10).filter(l => l.includes('/'));

    lines.forEach(line => {
        if (line.includes(keyword)) {
            const cols = line.split(',');
            cols.forEach((col, idx) => {
                if (col.includes(keyword)) {
                    // This column index contains badminton! Go through the header lines to find a date at this index.
                    for (let hLine of headerLines) {
                        const hCols = hLine.split(',');
                        if (hCols[idx] && hCols[idx].match(/\d+\/\d+/)) {
                            const dateStr = hCols[idx].trim().replace(/['"]/g, '');
                            if (!dates.includes(dateStr)) dates.push(dateStr);
                        }
                    }
                }
            });
        }
    });

    return dates;
};

export const fetchSchedules = async () => {
    try {
        const GID_NA = '2052167982';
        const GID_SC = '1494102004';
        const BASE_URL = 'https://docs.google.com/spreadsheets/d/1kyP8I4p7rqZEkHhgoKoEA44Viw7dStg0mC_22dpwX7Q/export?format=csv&gid=';

        const [naRes, scRes] = await Promise.all([
            fetch(BASE_URL + GID_NA, { cache: 'no-store' }),
            fetch(BASE_URL + GID_SC, { cache: 'no-store' })
        ]);

        const naText = await naRes.text();
        const scText = await scRes.text();

        return {
            "Thursday 6pm-9pm (Senior Center)": extractDates(scText, 'Badminton 6-9pm'),
            "Friday 6pm-9pm (Northside Aztlan)": extractDates(naText, 'Badminton 6p-9p'),
            "Sunday 12pm-5pm (Northside Aztlan)": extractDates(naText, 'Badminton 12p-5p')
        };
    } catch (e) {
        console.error("Failed to fetch schedules", e);
        return null;
    }
};
