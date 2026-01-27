document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'VITE_SUPABASE_URL';
    const supabaseKey = 'VITE_SUPABASE_ANON_KEY';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    const formData = {
        personal: {},
        feedback: {},
        locations: []
    };

    let currentStage = 0;
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
            const { data, error } = await supabaseClient
                .from('survey_responses_test')
                .insert([
                    {
                        user_name: formData.personal.name,
                        user_age: parseInt(formData.personal.age),
                        user_location: formData.personal.location,
                        transport_rating: formData.feedback.transportRating,
                        feedback_text: formData.feedback.likes,
                        selected_points: formData.locations
                    }
                ]);

            if (error) throw error;

            alert('Thank you for your submission for Bydgoszcz!');
            form.reset();
            markers.forEach(marker => map.removeLayer(marker));
            formData.locations = [];
            showStage(1);

        } catch (error) {
            console.error('Submission error:', error);
            alert(`Error: ${error.message || 'Check console for details'}`);
        }
    });

});
