'use client'; // Required for components that use React hooks

const DashboardClient = ({ initialData }: { initialData: any[] }) => {
  return (
    <div>
      <h1>Farm Performance Dashboard</h1>
      {initialData.map((plot, index) => (
        <div key={index} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
          <h3>Plot ID: {plot.plot_id}</h3>
          <p>ROI: {(plot.season_roi * 100).toFixed(2)}%</p>
          <p>Stress Index: {plot.plant_stress_index}</p>
        </div>
      ))}
    </div>
  );
};

export default DashboardClient;