/**
 * Generic picture of the car: a Wikipedia photo of the model when one is
 * found, otherwise an illustration in the listed colour.
 */
import { useEffect, useState } from 'react';
import { fetchCarPhoto, type CarPhoto } from '../api/carPhoto';
import CarIllustration from './CarIllustration';

interface Props {
  make?: string;
  model?: string;
  colour?: string;
  /** Your own photo or the advert photo, if there is one. */
  ownImageUrl?: string;
}

export default function CarPicture({ make, model, colour, ownImageUrl }: Props) {
  const [photo, setPhoto] = useState<CarPhoto>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setPhoto(undefined);
    setFailed(false);
    if (!ownImageUrl) fetchCarPhoto(make, model).then((p) => alive && setPhoto(p));
    return () => {
      alive = false;
    };
  }, [make, model, ownImageUrl]);

  if (ownImageUrl && !failed) {
    return (
      <figure className="car-picture">
        <img src={ownImageUrl} alt="" onError={() => setFailed(true)} />
      </figure>
    );
  }
  if (photo && !failed) {
    return (
      <figure className="car-picture">
        <img src={photo.imageUrl} alt={`${photo.title} (generic photo)`} onError={() => setFailed(true)} />
        <figcaption>
          Generic photo — colour may differ ·{' '}
          <a href={photo.pageUrl} target="_blank" rel="noopener noreferrer">Wikipedia</a>
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="car-picture car-picture--drawn">
      <CarIllustration colour={colour} />
    </figure>
  );
}
