import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Star, Clock, Search } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export const FavoritesPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login?redirect=/favorites");
      return;
    }

    if (user) fetchFavorites();
  }, [user, isLoading]);

  const fetchFavorites = async () => {
    try {
      const data = await apiRequest("/api/favorites", {
        token: user?.token,
      });

      setFavorites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (restaurantId: string) => {
    try {
      await apiRequest(`/api/favorites/${restaurantId}`, {
        method: "POST",
        token: user?.token,
      });

      fetchFavorites();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold">
        Loading favorites...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-500 text-xs font-black uppercase tracking-widest mb-4">
            <Heart size={16} fill="currentColor" />
            Saved Restaurants
          </span>

          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
            Your Favorites
          </h1>

          <p className="text-gray-500 mt-2 font-medium">
            Restaurants you saved for quick access.
          </p>
        </header>

        {favorites.length === 0 ? (
          <div className="bg-white rounded-[40px] border border-dashed border-gray-200 py-24 text-center">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              No favorites yet
            </h2>
            <p className="text-gray-500 mb-6">
              Save restaurants from their detail page.
            </p>

            <Link
              to="/"
              className="inline-block px-8 py-4 bg-orange-500 text-white rounded-2xl font-black"
            >
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {favorites.map((fav) => {
              const res = fav.restaurant;
              if (!res) return null;

              return (
                <div
                  key={fav._id}
                  className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group"
                >
                  <Link to={`/restaurant/${res._id}`}>
                    <div className="h-48 bg-gray-200 relative overflow-hidden">
                      <img
                        src={
                          res.images?.[0] ||
                          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000"
                        }
                        alt={res.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />

                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-red-500 shadow-sm flex items-center gap-1">
                        <Heart size={13} fill="currentColor" />
                        Saved
                      </div>
                    </div>
                  </Link>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <Link to={`/restaurant/${res._id}`}>
                        <h3 className="text-xl font-bold text-gray-900">
                          {res.name}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star fill="currentColor" size={16} />
                        <span className="text-sm font-bold">
                          {res.rating || 0}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-500 text-sm mb-4">
                      {(res.cuisine || []).join(" • ")}
                    </p>

                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Clock size={16} />
                        <span className="text-xs font-bold">20-30 min</span>
                      </div>

                      <button
                        onClick={() => removeFavorite(res._id)}
                        className="text-xs font-black text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};