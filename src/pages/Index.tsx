import { EuclideanSequencer } from "@/components/euclidean/EuclideanSequencer";
import { PerformanceMonitor } from "@/components/euclidean/PerformanceMonitor";

const Index = () => {
  return (
    <main className="min-h-screen flex items-start justify-center p-4 md:p-8 bg-idm-bg">
      <EuclideanSequencer />
      <PerformanceMonitor />
    </main>
  );
};

export default Index;
