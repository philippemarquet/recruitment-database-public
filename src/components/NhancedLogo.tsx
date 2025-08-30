interface NhancedLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'compact';
  showText?: boolean;
}

export const NhancedLogo = ({ 
  className = "", 
  variant = 'full',
  showText = true 
}: NhancedLogoProps) => {
  const logoImage = variant === 'full' 
    ? "/lovable-uploads/27962afa-2856-4fc7-b8a3-1cbbbed5a4ec.png"
    : "/lovable-uploads/5059d1b3-28cd-4788-a968-0200c79a4084.png";

  if (variant === 'icon') {
    return (
      <div className={`flex items-center ${className}`}>
        <img 
          src="/lovable-uploads/4779b18f-46cf-4049-8263-b3a5310e9088.png"
          alt="NHANCED"
          className="h-6 w-6"
        />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center ${className}`}>
        {showText && (
          <span className="text-lg font-bold text-nhanced-navy dark:text-white">
            NHANCED
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src={logoImage}
        alt="NHANCED"
        className="h-8"
      />
    </div>
  );
};