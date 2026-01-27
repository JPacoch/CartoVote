document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'YOUR_SUPABASE_URL';
    const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

    const formData = {
        personal: {},
        feedback: {},
        locations: []
    };

    let currentStage = 1;
    const stages = document.querySelectorAll('.stage');

    function showStage(stageNumber) {
        stages.forEach(stage => stage.classList.remove('active'));
        document.getElementById(`stage-${stageNumber}`).classList.add('active');
        currentStage = stageNumber;

        if (stageNumber === 3) {
            setTimeout(() => map.invalidateSize(), 10);
        }
    }

    document.querySelectorAll('.next-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (currentStage === 1) {
                formData.personal.name = document.getElementById('name').value;
                formData.personal.age = document.getElementById('age').value;
                formData.personal.location = document.getElementById('location').value;
                if (!formData.personal.name || !formData.personal.age || !formData.personal.location) {
                    alert('Please fill out all fields.');
                    return;
                }
            }
            if (currentStage === 2) {
                const transportRating = document.querySelector('input[name="transport"]:checked');
                formData.feedback.transportRating = transportRating ? transportRating.value : null;
                formData.feedback.likes = document.getElementById('feedback').value;
            }
            showStage(currentStage + 1);
        });
    });

    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => {
            showStage(currentStage - 1);
        });
    });

    const bydgoszczCoords = [53.1235, 18.0084];
    const map = L.map('map').setView(bydgoszczCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markers = [];

    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const point = { lat, lng };
        formData.locations.push(point);

        const marker = L.marker([lat, lng]).addTo(map);
        markers.push(marker);
    });

    const form = document.getElementById('questionnaire-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        console.log('Submitting data:', formData);

        if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
            alert('supabase not configured');
            return;
        }

        try {
            const response = await axios.post(`${supabaseUrl}/functions/v1/submit-survey`, formData, {
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                alert('Thank you for your submission!');
                form.reset();
                markers.forEach(marker => map.removeLayer(marker));
                formData.locations = [];
                showStage(1);
            } else {
                alert(`Error submitting data: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error submitting data:', error);
            alert('error submitting data');
        }
    });

    showStage(1);
});
