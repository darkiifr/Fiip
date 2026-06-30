import {
  IconArmenia,
  IconBulgaria,
  IconCroatia,
  IconFrance,
  IconGermany,
  IconIran,
  IconItaly,
  IconJapan,
  IconNetherlands,
  IconPoland,
  IconPortugal,
  IconRussia,
  IconSaudiArabia,
  IconSlovenia,
  IconSpain,
  IconUkraine,
  IconUnitedKingdom,
} from 'nucleo-flags';

const FLAG_ICONS = {
  IconArmenia,
  IconBulgaria,
  IconCroatia,
  IconFrance,
  IconGermany,
  IconIran,
  IconItaly,
  IconJapan,
  IconNetherlands,
  IconPoland,
  IconPortugal,
  IconRussia,
  IconSaudiArabia,
  IconSlovenia,
  IconSpain,
  IconUkraine,
  IconUnitedKingdom,
};

export default function NucleoFlag({ language, className = 'h-5 w-5 shrink-0 rounded-[3px]' }) {
  const Icon = FLAG_ICONS[language?.flagIcon];
  if (!Icon) {
    return (
      <span className={className} title={language?.nativeLabel || language?.label} aria-hidden="true">
        {language?.flag || ''}
      </span>
    );
  }

  return (
    <Icon
      className={className}
      title={language.nativeLabel || language.label}
      aria-label={language.nativeLabel || language.label}
    />
  );
}
