import { LocationSearch } from '@/components/LocationSearch';

const Index = () => {
  const apiKeys = {
    geocoding: 'AIzaSyBBizxEZH19qkO4GDzBkZAZ8pvy14wcjBs',
    geolocation: 'AIzaSyAbR4VzYYT2OhgJ_8DWAszxKOZwQ1pyFtQ',
    mapsStatic: 'AIzaSyCW8PE-yqe-PtuDH852UZpo139T9FXYne8',
    places: 'AIzaSyD8EE_1ZCdBK8N3OBVLfQmTQWRW0Iuk5Y8',
  };

  return <LocationSearch apiKeys={apiKeys} />;
};

export default Index;
