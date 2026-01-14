import { Header, ThemeToggle } from '@/components';
import { useAppState } from '@/lib';
import { STEP_COLORS } from '@/viz/PipelineViz';
import '@/styles/about.css';

/**
 * About page view
 */
export default function AboutPage() {
  const { data } = useAppState();
  const pipelineSteps = data?.pipeline_steps || [];
  const metadata = data?.metadata;

  return (
    <div className="main-layout">
      <Header />
      <main className="about-page">
        <article>
          <h1 className="t-page-title" style={{ marginBottom: 'var(--sp-8)' }}>
            About This Project
          </h1>

          <section className="about-section">
            <p className="about-intro">
              This interactive visualization explores methods for applying process mining 
              to unstructured data sources. It provides a comprehensive overview of techniques 
              that bridge the gap between raw unstructured information and structured event logs 
              suitable for process analysis.
            </p>
          </section>

          <section className="about-section">
            <h2 className="t-section-title" style={{ marginBottom: 'var(--sp-4)' }}>
              The Pipeline
            </h2>
            <p className="t-body" style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-5)' }}>
              The process mining pipeline for unstructured data consists of six key stages, 
              each addressing specific challenges in transforming raw data into actionable process insights.
            </p>

            <div className="pipeline-steps">
              {pipelineSteps.map((step) => (
                <div
                  key={step.id}
                  className="pipeline-step-card"
                  style={{ 
                    '--step-color': STEP_COLORS[step.id] || 'var(--accent)'
                  }}
                >
                  <div className="pipeline-step-card__header">
                    <span className="pipeline-step-card__number">
                      {step.order}
                    </span>
                    <h3 className="pipeline-step-card__title">{step.name}</h3>
                  </div>
                  <p className="pipeline-step-card__desc">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="about-section">
            <h2 className="t-section-title" style={{ marginBottom: 'var(--sp-4)' }}>
              Data Sources
            </h2>
            <p className="t-body" style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
              This taxonomy covers methods that work with various types of unstructured data:
            </p>
            <div className="data-sources">
              {['Text', 'Image', 'Video', 'Audio', 'Sensor', 'Real-Time'].map((type) => (
                <div key={type} className="data-source">
                  <span className={`tag tag--${type.toLowerCase().replace('-', '')}`}>{type}</span>
                  <span className="data-source__desc">
                    {type === 'Text' && 'Documents, emails, logs, and natural language'}
                    {type === 'Image' && 'Screenshots, diagrams, and visual records'}
                    {type === 'Video' && 'Recordings of processes and activities'}
                    {type === 'Audio' && 'Speech, sounds, and audio signals'}
                    {type === 'Sensor' && 'IoT data, time series, and measurements'}
                    {type === 'Real-Time' && 'Live streaming data and continuous feeds'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="about-section">
            <h2 className="t-section-title" style={{ marginBottom: 'var(--sp-4)' }}>
              Maturity Levels
            </h2>
            <p className="t-body" style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
              Methods are classified by their maturity level:
            </p>
            <div className="maturity-levels">
              <div className="maturity-level">
                <span className="maturity-level__badge maturity-level__badge--high">High</span>
                <span className="maturity-level__desc">
                  Well-established methods with proven implementations and extensive validation
                </span>
              </div>
              <div className="maturity-level">
                <span className="maturity-level__badge maturity-level__badge--medium">Medium</span>
                <span className="maturity-level__desc">
                  Developing techniques with initial implementations and validation
                </span>
              </div>
              <div className="maturity-level">
                <span className="maturity-level__badge maturity-level__badge--emerging">Emerging</span>
                <span className="maturity-level__desc">
                  Early-stage research with conceptual frameworks or prototypes
                </span>
              </div>
            </div>
          </section>

          {/* Settings Section */}
          <section className="about-section">
            <h2 className="t-section-title" style={{ marginBottom: 'var(--sp-4)' }}>
              Settings
            </h2>
            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">Appearance</span>
                <span className="settings-row__desc">
                  Switch between dark and light color schemes
                </span>
              </div>
              <ThemeToggle />
            </div>
          </section>

          {metadata && (
            <section className="about-section about-metadata">
              <div className="metadata-item">
                <span className="t-caption">Version</span>
                <span className="t-body">{metadata.version}</span>
              </div>
              <div className="metadata-item">
                <span className="t-caption">Last Updated</span>
                <span className="t-body">{metadata.last_updated}</span>
              </div>
              <div className="metadata-item">
                <span className="t-caption">Total Methods</span>
                <span className="t-body">{data?.methods?.length || 0}</span>
              </div>
            </section>
          )}
        </article>
      </main>
    </div>
  );
}
